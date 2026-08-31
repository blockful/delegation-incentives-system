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
  seconds,
  BlockNotFinalizedError,
  type Address,
  type Wei,
  type Proposal,
  type PoolTier,
  type BlockNumber,
  wei,
  blockNumber,
} from "@ens-dis/domain";
import { and, eq, desc, inArray, lte } from "drizzle-orm";
import { selectFinalizedProposalsBefore } from "../adapters/proposal-adapter.js";
import { createBlockAdapter } from "../adapters/block-adapter.js";

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

// Month-start block resolution is an RPC binary search; the result is
// constant for the whole month, so cache it per month string.
let monthStartBlockCache: { month: string; block: BlockNumber } | null = null;

async function getMonthStartBlock(month: string): Promise<BlockNumber | undefined> {
  if (monthStartBlockCache?.month === month) return monthStartBlockCache.block;
  const blockAdapter = createBlockAdapter(publicClients.mainnet);
  let block: BlockNumber;
  try {
    block = await blockAdapter.getBlockForTimestamp(
      seconds(monthStartTimestamp(month)),
    );
  } catch (error) {
    // Right after month rollover the month-start block is not finalized yet
    // (~13 min); degrade to the current window instead of failing the route.
    if (error instanceof BlockNotFinalizedError) return undefined;
    throw error;
  }
  monthStartBlockCache = { month, block };
  return block;
}

/**
 * Current-month VP growth with the same semantics as the settlement pipeline
 * (runDistributionPipeline steps 2–4): the START set is the voters active in
 * the proposal window at month start, the END set the voters active in the
 * window at the chain head. The sets differ, so this is not "same voters,
 * two dates" — a whale active at month start but not now shows up as
 * negative growth, exactly as it will at payout time.
 */
export async function fetchCurrentGrowth(database: Db): Promise<{
  activeVoters: Set<Address>;
  vpStart: Wei;
  vpEnd: Wei;
  growthPct: number;
  tier: PoolTier;
}> {
  const startBlock = await getMonthStartBlock(getCurrentMonth());
  const [{ activeVoters: activeVotersStart }, { activeVoters }] =
    await Promise.all([
      fetchActiveVoters(database, startBlock),
      fetchActiveVoters(database),
    ]);
  const growth = await fetchCurrentVpGrowth(database, activeVotersStart, activeVoters);
  return { activeVoters, ...growth };
}

/** Fetch current VP growth (estimates start-of-current-month to now). */
export async function fetchCurrentVpGrowth(
  database: Db,
  activeVotersStart: Set<Address>,
  activeVotersEnd: Set<Address>,
): Promise<{
  vpStart: Wei;
  vpEnd: Wei;
  growthPct: number;
  tier: PoolTier;
}> {
  // vpEnd: latest VP snapshot per voter (current state)
  const endVoters = [...activeVotersEnd];
  let vpEnd = 0n;
  for (const voter of endVoters) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(eq(ensVotingPowerSnapshot.voterId, voter.toLowerCase()))
      .orderBy(desc(ensVotingPowerSnapshot.timestamp))
      .limit(1);
    if (rows.length > 0) {
      vpEnd += BigInt(rows[0].votingPower);
    }
  }

  // vpStart: latest VP snapshot at or before prevMonthEnd (monthStart - 1s),
  // the same boundary the pipeline uses.
  const prevMonthEndTs = monthStartTimestamp(getCurrentMonth()) - 1n;

  const startVoters = [...activeVotersStart];
  let vpStart = 0n;
  for (const voter of startVoters) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          eq(ensVotingPowerSnapshot.voterId, voter.toLowerCase()),
          lte(ensVotingPowerSnapshot.timestamp, prevMonthEndTs),
        ),
      )
      .orderBy(desc(ensVotingPowerSnapshot.timestamp))
      .limit(1);
    if (rows.length > 0) {
      vpStart += BigInt(rows[0].votingPower);
    }
  }

  const growthPct = computeVpGrowthPct(wei(vpStart), wei(vpEnd));
  const tier = selectPoolTier(growthPct);

  return { vpStart: wei(vpStart), vpEnd: wei(vpEnd), growthPct, tier };
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
      .orderBy(desc(ensVotingPowerSnapshot.timestamp))
      .limit(1);
    if (rows.length > 0) {
      total += BigInt(rows[0].votingPower);
    }
  }
  return total;
}
