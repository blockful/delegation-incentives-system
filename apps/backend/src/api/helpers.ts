import { db, publicClients } from "ponder:api";
import {
  governanceVote,
  ensVotingPowerSnapshot,
} from "ponder:schema";
import {
  PROPOSAL_WINDOW_SIZE,
  ACTIVE_VOTE_THRESHOLD,
  POOL_TIERS,
  computeVpGrowthPct,
  selectPoolTier,
  monthStartTimestamp,
  monthEndTimestamp,
  seconds,
  BlockNotFinalizedError,
  type Address,
  type Wei,
  type Proposal,
  type PoolTier,
  type BlockNumber,
  blockNumber,
} from "@ens-dis/domain";
import { eq, desc, inArray } from "drizzle-orm";
import { selectFinalizedProposalsBefore } from "../adapters/proposal-adapter.js";
import { createBlockAdapter } from "../adapters/block-adapter.js";
import { createVotingPowerAdapter } from "../adapters/voting-power-adapter.js";

type Db = typeof db;

/**
 * Fetch active voters from the current indexed state, or — when `atBlock`
 * is given — from the proposal window as it stood at that block.
 */
export async function fetchActiveVoters(database: Db, atBlock?: BlockNumber): Promise<{
  activeVoters: Set<Address>;
  proposals: Proposal[];
  proposalIds: string[];
  voteCounts: Map<Address, number>;
  voterProposals: Map<Address, Set<string>>;
}> {
  // 1. Get finalized proposals — same query the reward pipeline uses
  // (proposal-adapter), bounded at the current chain head so a still-'active'
  // proposal whose voting period already ended is included, exactly as it
  // will be at payout time.
  const boundaryBlock =
    atBlock ?? blockNumber(await publicClients.mainnet.getBlockNumber());
  const windowProposals = await selectFinalizedProposalsBefore(
    database,
    boundaryBlock,
    PROPOSAL_WINDOW_SIZE,
  );

  // 2. Get all votes for those proposals
  const proposalIds = windowProposals.map((p) => p.id);
  let voteRows: { voter: string; proposalId: string }[] = [];
  if (proposalIds.length > 0) {
    voteRows = await database
      .select({ voter: governanceVote.voter, proposalId: governanceVote.proposalId })
      .from(governanceVote)
      .where(inArray(governanceVote.proposalId, proposalIds));
  }

  // 3. Build deduplicated vote counts per voter
  const proposalIdSet = new Set(proposalIds);
  const voterProposals = new Map<Address, Set<string>>();

  for (const row of voteRows) {
    if (!proposalIdSet.has(row.proposalId)) continue;
    const voter = row.voter as Address;
    let seen = voterProposals.get(voter);
    if (!seen) {
      seen = new Set<string>();
      voterProposals.set(voter, seen);
    }
    seen.add(row.proposalId);
  }

  const voteCounts = new Map<Address, number>();
  const activeVoters = new Set<Address>();

  for (const [voter, proposalsVoted] of voterProposals) {
    const count = proposalsVoted.size;
    voteCounts.set(voter, count);
    if (count >= ACTIVE_VOTE_THRESHOLD) {
      activeVoters.add(voter);
    }
  }

  return { activeVoters, proposals: windowProposals, proposalIds, voteCounts, voterProposals };
}

// ── Current-month growth (display) ──────────────────────────────────────────
//
// The month-start boundary block and its active-voter set are immutable for
// the whole month once the boundary block is finalized, so both are cached
// per month. The cache holds the in-flight promise (not the resolved value)
// so concurrent cold-cache requests share one RPC binary search; entries that
// fail or resolve "not finalized yet" are dropped so the next request retries.
type MonthStartSet = { activeVotersStart: Set<Address> } | undefined;

let monthStartCache: { month: string; promise: Promise<MonthStartSet> } | null =
  null;

function getMonthStartSet(database: Db, month: string): Promise<MonthStartSet> {
  if (monthStartCache?.month === month) return monthStartCache.promise;
  const entry = {
    month,
    promise: (async (): Promise<MonthStartSet> => {
      const blockAdapter = createBlockAdapter(publicClients.mainnet);
      let block: BlockNumber;
      try {
        block = await blockAdapter.getBlockForTimestamp(
          seconds(monthStartTimestamp(month)),
        );
      } catch (error) {
        // Right after month rollover the month-start block is not finalized
        // yet (~13 min); degrade to the current window instead of failing.
        if (error instanceof BlockNotFinalizedError) return undefined;
        throw error;
      }
      const { activeVoters } = await fetchActiveVoters(database, block);
      return { activeVotersStart: activeVoters };
    })(),
  };
  monthStartCache = entry;
  entry.promise.then(
    (result) => {
      if (result === undefined && monthStartCache === entry) monthStartCache = null;
    },
    () => {
      if (monthStartCache === entry) monthStartCache = null;
    },
  );
  return entry.promise;
}

export interface CurrentGrowth {
  activeVoters: Set<Address>;
  vpStart: Wei;
  vpEnd: Wei;
  growthPct: number;
  tier: PoolTier;
  /**
   * True while the month-start block is not finalized yet and the current
   * voter set is used for both boundaries (pre-two-window behavior).
   */
  degraded: boolean;
}

// Growth inputs change at block/indexing cadence; memoize briefly so one page
// load hitting several routes (tiers, apr, rewards, rounds) shares a single
// computation.
const GROWTH_MEMO_TTL_MS = 30_000;
let growthMemo: { at: number; promise: Promise<CurrentGrowth> } | null = null;

/** Reset module-level growth caches (test hook). */
export function resetGrowthCaches(): void {
  monthStartCache = null;
  growthMemo = null;
}

/**
 * Current-month VP growth with the same semantics as the settlement pipeline
 * (runDistributionPipeline steps 2–4): the START set is the voters active in
 * the proposal window at month start, the END set the voters active in the
 * window at the chain head. The sets differ, so this is not "same voters,
 * two dates" — a whale active at month start but not now shows up as
 * negative growth, exactly as it will at payout time.
 */
export function fetchCurrentGrowth(database: Db): Promise<CurrentGrowth> {
  if (growthMemo && Date.now() - growthMemo.at < GROWTH_MEMO_TTL_MS) {
    return growthMemo.promise;
  }
  const entry = { at: Date.now(), promise: computeCurrentGrowth(database) };
  growthMemo = entry;
  entry.promise.catch(() => {
    if (growthMemo === entry) growthMemo = null;
  });
  return entry.promise;
}

async function computeCurrentGrowth(database: Db): Promise<CurrentGrowth> {
  // Resolve the month once so a request straddling the UTC rollover cannot
  // mix two months' boundaries.
  const month = getCurrentMonth();

  const [monthStart, { activeVoters }] = await Promise.all([
    getMonthStartSet(database, month),
    fetchActiveVoters(database),
  ]);

  const degraded = monthStart === undefined;
  const activeVotersStart =
    monthStart === undefined ? activeVoters : monthStart.activeVotersStart;

  // Same boundaries and tie-broken snapshot resolution as the pipeline:
  // vpStart at prevMonthEnd (monthStart - 1s), vpEnd bounded at month end
  // (i.e. "latest so far" for the running month).
  const vpAdapter = createVotingPowerAdapter(database);
  const [vpStart, vpEnd] = await Promise.all([
    vpAdapter.getAggregateVpAtTimestamp(
      [...activeVotersStart],
      seconds(monthStartTimestamp(month) - 1n),
    ),
    vpAdapter.getAggregateVpAtTimestamp(
      [...activeVoters],
      seconds(monthEndTimestamp(month)),
    ),
  ]);

  return {
    activeVoters,
    vpStart,
    vpEnd,
    ...assembleGrowth(vpStart, vpEnd, activeVoters.size),
    degraded,
  };
}

/**
 * Growth + tier from the two boundary aggregates, mirroring the pipeline's
 * rules: an empty END set means growth 0 / tier 0 (its early-exit), and
 * negative growth maps to tier 0.
 */
export function assembleGrowth(
  vpStart: Wei,
  vpEnd: Wei,
  endSetSize: number,
): { growthPct: number; tier: PoolTier } {
  const growthPct = endSetSize === 0 ? 0 : computeVpGrowthPct(vpStart, vpEnd);
  return { growthPct, tier: selectPoolTier(growthPct) };
}

/** Format Wei to ENS string (18 decimals). */
export function formatEns(value: bigint): string {
  const whole = value / 10n ** 18n;
  const frac = value % 10n ** 18n;
  const fracAbs = frac < 0n ? -frac : frac;
  return `${whole}.${fracAbs.toString().padStart(18, "0")}`;
}

/** Format a growth range label for a tier. */
export function formatGrowthRange(tier: PoolTier): string {
  if (tier.maxGrowthPct === Infinity) {
    return `${tier.minGrowthPct}%+`;
  }
  return `${tier.minGrowthPct}-${tier.maxGrowthPct}%`;
}

/** Get current YYYY-MM month string. */
export function getCurrentMonth(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/** Get days remaining in the current month. */
export function getDaysRemainingInMonth(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const currentDay = now.getUTCDate();
  return lastDay - currentDay;
}

/** Validate and normalize an Ethereum address from URL params. */
export function normalizeAddress(raw: string): Address | null {
  const trimmed = raw.trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(trimmed)) {
    return null;
  }
  return trimmed as Address;
}

/** Find the tier index for a given growth percentage. */
export function findTierIndex(growthPct: number): number {
  for (let i = 0; i < POOL_TIERS.length; i++) {
    const t = POOL_TIERS[i];
    if (growthPct >= t.minGrowthPct && growthPct < t.maxGrowthPct) {
      return i;
    }
  }
  return 0;
}

/** Get total VP for a set of active voters. */
export async function getActiveVpTotal(database: Db, activeVoters: Set<Address>): Promise<bigint> {
  let total = 0n;
  for (const voter of activeVoters) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(eq(ensVotingPowerSnapshot.voterId, voter.toLowerCase()))
      .orderBy(
        desc(ensVotingPowerSnapshot.timestamp),
        desc(ensVotingPowerSnapshot.blockNumber),
        desc(ensVotingPowerSnapshot.logIndex),
      )
      .limit(1);
    if (rows.length > 0) {
      total += BigInt(rows[0].votingPower);
    }
  }
  return total;
}
