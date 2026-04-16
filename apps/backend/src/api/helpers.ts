import { db } from "ponder:api";
import {
  governanceProposal,
  governanceVote,
  ensVotingPowerSnapshot,
} from "ponder:schema";
import {
  getLastFinalizedProposals,
  PROPOSAL_WINDOW,
  ACTIVE_THRESHOLD,
  POOL_TIERS,
  FINALIZED_STATUSES,
  computeVpGrowthPct,
  selectPoolTier,
  type Address,
  type Wei,
  type Proposal,
  type ProposalStatus,
  type PoolTier,
  seconds,
  wei,
  blockNumber,
} from "@ens-dis/domain";
import { and, eq, desc, inArray, lte } from "drizzle-orm";

type Db = typeof db;

const FINALIZED_STATUS_LIST = [...FINALIZED_STATUSES] as string[];

/** Fetch active delegates from the current indexed state. */
export async function fetchActiveDelegates(database: Db): Promise<{
  activeDelegates: Set<Address>;
  proposals: Proposal[];
  voteCounts: Map<Address, number>;
}> {
  // 1. Get finalized proposals
  const proposalRows = await database
    .select()
    .from(governanceProposal)
    .where(inArray(governanceProposal.status, FINALIZED_STATUS_LIST))
    .orderBy(desc(governanceProposal.finalizedTimestamp))
    .limit(PROPOSAL_WINDOW);

  const proposals: Proposal[] = proposalRows.map((row) => ({
    id: row.id,
    status: row.status as ProposalStatus,
    finalizedTimestamp: seconds(BigInt(row.finalizedTimestamp!)),
    startBlock: blockNumber(BigInt(row.startBlock)),
    endBlock: blockNumber(BigInt(row.endBlock)),
  }));

  const windowProposals = getLastFinalizedProposals(proposals, PROPOSAL_WINDOW);

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
  const activeDelegates = new Set<Address>();

  for (const [voter, proposalsVoted] of voterProposals) {
    const count = proposalsVoted.size;
    voteCounts.set(voter, count);
    if (count >= ACTIVE_THRESHOLD) {
      activeDelegates.add(voter);
    }
  }

  return { activeDelegates, proposals: windowProposals, voteCounts };
}

/** Fetch current VP growth (estimates start-of-current-month to now). */
export async function fetchCurrentVpGrowth(
  database: Db,
  activeDelegatesStart: Set<Address>,
  activeDelegatesEnd: Set<Address>,
): Promise<{
  vpStart: Wei;
  vpEnd: Wei;
  growthPct: number;
  tier: PoolTier;
}> {
  // vpEnd: latest VP snapshot per delegate (current state)
  const endDelegates = [...activeDelegatesEnd];
  let vpEnd = 0n;
  for (const delegate of endDelegates) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(eq(ensVotingPowerSnapshot.accountId, delegate.toLowerCase()))
      .orderBy(desc(ensVotingPowerSnapshot.timestamp))
      .limit(1);
    if (rows.length > 0) {
      vpEnd += BigInt(rows[0].votingPower);
    }
  }

  // vpStart: latest VP snapshot at or before month start
  const monthStr = getCurrentMonth();
  const [year, monthNum] = monthStr.split("-").map(Number);
  const monthStartTs = BigInt(Math.floor(Date.UTC(year, monthNum - 1, 1) / 1000));

  const startDelegates = [...activeDelegatesStart];
  let vpStart = 0n;
  for (const delegate of startDelegates) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(
        and(
          eq(ensVotingPowerSnapshot.accountId, delegate.toLowerCase()),
          lte(ensVotingPowerSnapshot.timestamp, monthStartTs),
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

/** Get total VP for a set of active delegates. */
export async function getActiveVpTotal(database: Db, activeDelegates: Set<Address>): Promise<bigint> {
  let total = 0n;
  for (const delegate of activeDelegates) {
    const rows = await database
      .select({ votingPower: ensVotingPowerSnapshot.votingPower })
      .from(ensVotingPowerSnapshot)
      .where(eq(ensVotingPowerSnapshot.accountId, delegate.toLowerCase()))
      .orderBy(desc(ensVotingPowerSnapshot.timestamp))
      .limit(1);
    if (rows.length > 0) {
      total += BigInt(rows[0].votingPower);
    }
  }
  return total;
}
