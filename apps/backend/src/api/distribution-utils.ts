import {
  blockNumber,
  LOTTERY_BUCKET_TARGET,
  MIN_REWARD_THRESHOLD,
  POOL_TIERS,
  seconds,
  wei,
  type Address,
  type CapStatus,
  type CombinedReward,
  type DistributionResult,
  type TokenHolderRewardProvenance,
  type TokenHolderSource,
  type VoterRewardProvenance,
} from "@ens-dis/domain";
import { formatEns } from "./helpers.js";

export interface DistributionStorageRow {
  month: string;
  resultJson: string;
  computedAt?: bigint | number | string | null;
}

export interface ParsedDistribution {
  row: DistributionStorageRow;
  result: DistributionResult;
}

export interface DistributionSnapshot {
  month: string;
  tierIndex: number;
  vpGrowthPct: string;
  poolSize: string;
  poolSizeEns: string;
  totalDistributed: string;
  totalDistributedEns: string;
  activeVoterCount: number;
  eligibleTokenHolderCount: number;
  lotteryBucketCount: number;
  lotteryEntryCount: number;
  lotteryParticipantCount: number;
  lotteryWinnerCount: number;
  lotteryPrize: string;
  lotteryPrizeEns: string;
  computedAt: string;
}

export interface RewardRank {
  rank: number;
  address: string;
  ensName: string | null;
  role: "voter" | "token_holder";
  reward: string;
  rewardEns: string;
  source: "direct" | "lottery" | "combined";
  votingPower: string | null;
  tokenHolderBalance: string | null;
  delegationCount: number | null;
}

export interface VoterProvenanceDetail {
  avgVotingPower: string;
  avgVotingPowerEns: string;
  poolSharePct: string;
  rawReward: string;
  rawRewardEns: string;
  finalReward: string;
  finalRewardEns: string;
  cap: string;
  capEns: string;
  capStatus: CapStatus;
  redistributionReceived: string;
  redistributionReceivedEns: string;
}

export interface TokenHolderProvenanceDetail {
  avgBalance: string;
  avgBalanceEns: string;
  poolSharePct: string;
  rawReward: string;
  rawRewardEns: string;
  finalReward: string;
  finalRewardEns: string;
  cap: string;
  capEns: string;
  capStatus: CapStatus;
  redistributionReceived: string;
  redistributionReceivedEns: string;
  sources: TokenHolderSource[] | null;
}

export interface RewardProvenance {
  voter: VoterProvenanceDetail | null;
  tokenHolder: TokenHolderProvenanceDetail | null;
}

export interface AddressRewardBreakdown {
  address: string;
  voterReward: string;
  voterRewardEns: string;
  tokenHolderReward: string;
  tokenHolderRewardEns: string;
  lotteryReward: string;
  lotteryRewardEns: string;
  totalReward: string;
  totalRewardEns: string;
  status: "paid" | "no_reward" | "not_eligible";
  /**
   * Allocation provenance for the round's direct rewards. Null for rounds
   * whose result_json predates provenance persistence and for wallets with
   * no eligibility signal. Lottery winnings carry no provenance — seed and
   * odds are served by the lottery payload.
   */
  provenance: RewardProvenance | null;
}

export interface LotteryEntryDetail {
  bucketIndex: number;
  entryIndex: number;
  address: string;
  ensName: string | null;
  amount: string;
  amountEns: string;
  probability: string;
}

export interface LotteryBucketDetail {
  bucketIndex: number;
  prize: string;
  prizeEns: string;
  winner: string;
  winnerEnsName: string | null;
  winnerProbability: string | null;
  entryCount: number;
  entries: LotteryEntryDetail[];
}

export interface LotteryDetail {
  seed: {
    source: "ethereum_prev_randao";
    label: string;
    value: string;
    blockNumber: string;
    algorithm: string;
  };
  bucketTarget: string;
  bucketTargetEns: string;
  totalPrize: string;
  totalPrizeEns: string;
  bucketCount: number;
  entryCount: number;
  participantCount: number;
  winnerCount: number;
  buckets: LotteryBucketDetail[];
}

/**
 * Wire shape of a persisted `result_json` blob: a DistributionResult
 * serialized by distributionToJson, i.e. every BigInt (Wei / Seconds /
 * BlockNumber) written as a decimal string. Optional fields are absent on
 * blobs persisted before the matching feature shipped — old rounds are
 * never recomputed, so both generations stay readable.
 */
export interface RawDistributionResult {
  metadata: RawDistributionMetadata;
  rewards: RawCombinedReward[];
  lottery: {
    buckets: RawLotteryBucket[];
  };
  /**
   * Deduplication log as persisted. The API layer never reads it and its
   * wire shape has drifted across blob generations (early blobs name the
   * multiDelegate voter column `delegate`), so it stays opaque here and is
   * passed through unconverted by reviveDistributionResult.
   */
  deduplication: unknown;
}

interface RawDistributionMetadata {
  month: string;
  /** Seconds since epoch, decimal strings. */
  monthStart: string;
  monthEnd: string;
  /** Block numbers, decimal strings. */
  startBlock: string;
  endBlock: string;
  randaoValue: string;
  /** Wei, decimal strings. */
  vpStart: string;
  vpEnd: string;
  vpGrowthPct: string;
  tier: number;
  /** Wei, decimal strings. */
  poolSize: string;
  voterCap: string;
  tokenHolderCap: string;
  activeVoterCount: number;
  finalizedProposalIds: string[];
  /** Absent on blobs persisted before provenance persistence. */
  provenanceVersion?: number;
}

interface RawCombinedReward {
  address: Address;
  /** Wei, decimal strings. */
  voterReward: string;
  tokenHolderReward: string;
  /** Wei, decimal string. Absent on pre-feature blobs. */
  tokenHolderBalance?: string;
  /** Wei, decimal string. */
  total: string;
  /** Absent on blobs persisted before provenanceVersion 1. */
  voterProvenance?: RawVoterRewardProvenance;
  /** Absent on blobs persisted before provenanceVersion 1. */
  tokenHolderProvenance?: RawTokenHolderRewardProvenance;
}

interface RawVoterRewardProvenance {
  /** Wei, decimal string. */
  avgVotingPower: string;
  poolSharePct: string;
  /** Wei, decimal string. */
  rawReward: string;
  capStatus: CapStatus;
  /** Wei, decimal string. */
  redistributionReceived: string;
}

interface RawTokenHolderRewardProvenance {
  poolSharePct: string;
  /** Wei, decimal string. */
  rawReward: string;
  capStatus: CapStatus;
  /** Wei, decimal string. */
  redistributionReceived: string;
  sources: TokenHolderSource[];
}

/**
 * Revives one persisted voter-provenance row. A malformed row (the pipeline
 * never writes one — this means a hand-edited or corrupted blob) is treated
 * as absent so the endpoint degrades to `provenance: null` for that wallet
 * instead of failing the whole round revive with a 500.
 */
function reviveVoterProvenance(
  raw: RawVoterRewardProvenance,
): VoterRewardProvenance | undefined {
  try {
    return {
      avgVotingPower: wei(BigInt(raw.avgVotingPower)),
      poolSharePct: raw.poolSharePct,
      rawReward: wei(BigInt(raw.rawReward)),
      capStatus: raw.capStatus,
      redistributionReceived: wei(BigInt(raw.redistributionReceived)),
    };
  } catch {
    return undefined;
  }
}

/** See {@link reviveVoterProvenance} — same malformed-row semantics. */
function reviveTokenHolderProvenance(
  raw: RawTokenHolderRewardProvenance,
): TokenHolderRewardProvenance | undefined {
  try {
    return {
      poolSharePct: raw.poolSharePct,
      rawReward: wei(BigInt(raw.rawReward)),
      capStatus: raw.capStatus,
      redistributionReceived: wei(BigInt(raw.redistributionReceived)),
      sources: raw.sources,
    };
  } catch {
    return undefined;
  }
}

interface RawLotteryBucket {
  bucketIndex: number;
  entries: RawLotteryEntry[];
  /** Wei, decimal string. */
  prize: string;
  winner: Address;
}

interface RawLotteryEntry {
  address: Address;
  /** Wei, decimal string. */
  amount: string;
  probability: string;
}

export function reviveDistributionResult(
  raw: RawDistributionResult,
): DistributionResult {
  return {
    metadata: {
      month: raw.metadata.month,
      monthStart: seconds(BigInt(raw.metadata.monthStart)),
      monthEnd: seconds(BigInt(raw.metadata.monthEnd)),
      startBlock: blockNumber(BigInt(raw.metadata.startBlock)),
      endBlock: blockNumber(BigInt(raw.metadata.endBlock)),
      randaoValue: raw.metadata.randaoValue,
      vpStart: wei(BigInt(raw.metadata.vpStart)),
      vpEnd: wei(BigInt(raw.metadata.vpEnd)),
      vpGrowthPct: raw.metadata.vpGrowthPct,
      tier: raw.metadata.tier,
      poolSize: wei(BigInt(raw.metadata.poolSize)),
      voterCap: wei(BigInt(raw.metadata.voterCap)),
      tokenHolderCap: wei(BigInt(raw.metadata.tokenHolderCap)),
      activeVoterCount: raw.metadata.activeVoterCount,
      finalizedProposalIds: raw.metadata.finalizedProposalIds,
      ...(raw.metadata.provenanceVersion != null && {
        provenanceVersion: raw.metadata.provenanceVersion,
      }),
    },
    rewards: raw.rewards.map((r) => {
      // Provenance is absent on blobs persisted before provenanceVersion 1.
      // Old rounds are never recomputed — the API exposes provenance: null.
      // A malformed row is likewise treated as absent (see the helpers).
      const voterProvenance = r.voterProvenance
        ? reviveVoterProvenance(r.voterProvenance)
        : undefined;
      const tokenHolderProvenance = r.tokenHolderProvenance
        ? reviveTokenHolderProvenance(r.tokenHolderProvenance)
        : undefined;

      return {
        address: r.address,
        voterReward: wei(BigInt(r.voterReward)),
        tokenHolderReward: wei(BigInt(r.tokenHolderReward)),
        // Backfill missing field on pre-feature JSON blobs so historic rounds
        // still load. Round detail UI shows "—" when this is 0.
        tokenHolderBalance: wei(BigInt(r.tokenHolderBalance ?? "0")),
        total: wei(BigInt(r.total)),
        ...(voterProvenance && { voterProvenance }),
        ...(tokenHolderProvenance && { tokenHolderProvenance }),
      };
    }),
    lottery: {
      buckets: raw.lottery.buckets.map((b) => ({
        bucketIndex: b.bucketIndex,
        entries: b.entries.map((e) => ({
          address: e.address,
          amount: wei(BigInt(e.amount)),
          probability: e.probability,
        })),
        prize: wei(BigInt(b.prize)),
        winner: b.winner,
      })),
    },
    // Single remaining assertion in this file: the dedup log is passed
    // through as persisted (Wei amounts stay decimal strings at runtime,
    // legacy field names included) because nothing downstream reads it.
    // Converting it here would change revived values for a subtree no code
    // consumes — see the RawDistributionResult.deduplication doc comment.
    deduplication: raw.deduplication as DistributionResult["deduplication"],
  };
}

export function parseDistributionRow(row: DistributionStorageRow): ParsedDistribution {
  // Trust boundary: result_json is only ever written by distributionToJson,
  // so the parsed blob is taken to match RawDistributionResult.
  const raw: RawDistributionResult = JSON.parse(row.resultJson);

  return {
    row,
    result: reviveDistributionResult(raw),
  };
}

export function parseDistributionRows(
  rows: readonly DistributionStorageRow[],
): Map<string, ParsedDistribution> {
  const parsed = new Map<string, ParsedDistribution>();

  for (const row of rows) {
    parsed.set(row.month, parseDistributionRow(row));
  }

  return parsed;
}

/** Transform raw DistributionResult into the existing frontend distribution shape. */
export function distributionToApiResponse(parsed: ParsedDistribution) {
  const { result, row } = parsed;
  const meta = result.metadata;
  const tierConfig = POOL_TIERS[meta.tier] ?? POOL_TIERS[0];
  const minReward = MIN_REWARD_THRESHOLD;

  const directPayouts = result.rewards
    .filter((r) => r.total >= minReward)
    .map((r) => {
      const role: "voter" | "token_holder" =
        r.voterReward > 0n ? "voter" : "token_holder";
      return {
        address: r.address,
        ensName: null,
        amount: r.total.toString(),
        amountEns: formatEns(r.total),
        role,
      };
    });

  const lotteryPools = result.lottery.buckets.map((bucket) => ({
    totalPrize: bucket.prize.toString(),
    totalPrizeEns: formatEns(bucket.prize),
    winner: bucket.winner,
    winnerEnsName: null,
    entries: bucket.entries.map((e) => ({
      address: e.address,
      ensName: null,
      originalAmount: e.amount.toString(),
      role: "token_holder" as const,
    })),
  }));

  const totalDistributed = getTotalDistributed(result);
  const eligibleTokenHolderCount = result.rewards.filter(
    (r) => r.tokenHolderReward > 0n,
  ).length;
  const growthPct = Number.parseFloat(meta.vpGrowthPct);
  const momGrowthBps = Number.isFinite(growthPct)
    ? Math.round(growthPct * 100).toString()
    : "0";

  return {
    month: meta.month,
    metadata: {
      totalDistributed: totalDistributed.toString(),
      totalDistributedEns: formatEns(totalDistributed),
      poolTier: {
        momGrowthMinBps: (tierConfig.minGrowthPct * 100).toString(),
        momGrowthMaxBps: tierConfig.maxGrowthPct === Infinity
          ? "Infinity"
          : (tierConfig.maxGrowthPct * 100).toString(),
        poolSize: tierConfig.poolSize.toString(),
        voterCap: tierConfig.voterCap.toString(),
        tokenHolderCap: tierConfig.tokenHolderCap.toString(),
      },
      momGrowthBps,
      activeVoterCount: meta.activeVoterCount,
      eligibleTokenHolderCount,
      computedAt: computedAtToIso(row.computedAt),
      randaoSeed: meta.randaoValue,
    },
    directPayouts,
    lotteryPools,
  };
}

export function getDistributionSnapshot(parsed: ParsedDistribution): DistributionSnapshot {
  const { result, row } = parsed;
  const meta = result.metadata;
  const totalDistributed = getTotalDistributed(result);
  const eligibleTokenHolderCount = result.rewards.filter(
    (r) => r.tokenHolderReward > 0n,
  ).length;
  const lotteryStats = getLotteryStats(result);

  return {
    month: meta.month,
    tierIndex: meta.tier,
    vpGrowthPct: meta.vpGrowthPct,
    poolSize: meta.poolSize.toString(),
    poolSizeEns: formatEns(meta.poolSize),
    totalDistributed: totalDistributed.toString(),
    totalDistributedEns: formatEns(totalDistributed),
    activeVoterCount: meta.activeVoterCount,
    eligibleTokenHolderCount,
    lotteryBucketCount: lotteryStats.bucketCount,
    lotteryEntryCount: lotteryStats.entryCount,
    lotteryParticipantCount: lotteryStats.participantCount,
    lotteryWinnerCount: lotteryStats.winnerCount,
    lotteryPrize: lotteryStats.totalPrize.toString(),
    lotteryPrizeEns: formatEns(lotteryStats.totalPrize),
    computedAt: computedAtToIso(row.computedAt),
  };
}

export function getLotteryDetail(parsed: ParsedDistribution): LotteryDetail {
  const { result } = parsed;
  const meta = result.metadata;
  const lotteryStats = getLotteryStats(result);

  return {
    seed: {
      source: "ethereum_prev_randao",
      label: "Ethereum prevRandao",
      value: meta.randaoValue,
      blockNumber: meta.endBlock.toString(),
      algorithm: "keccak256(prevRandao, bucketIndex)",
    },
    bucketTarget: LOTTERY_BUCKET_TARGET.toString(),
    bucketTargetEns: formatEns(LOTTERY_BUCKET_TARGET),
    totalPrize: lotteryStats.totalPrize.toString(),
    totalPrizeEns: formatEns(lotteryStats.totalPrize),
    bucketCount: lotteryStats.bucketCount,
    entryCount: lotteryStats.entryCount,
    participantCount: lotteryStats.participantCount,
    winnerCount: lotteryStats.winnerCount,
    buckets: result.lottery.buckets.map((bucket) => {
      const winner = bucket.winner.toLowerCase();
      const winnerEntry = bucket.entries.find(
        (entry) => entry.address.toLowerCase() === winner,
      );

      return {
        bucketIndex: bucket.bucketIndex,
        prize: bucket.prize.toString(),
        prizeEns: formatEns(bucket.prize),
        winner: bucket.winner,
        winnerEnsName: null,
        winnerProbability: winnerEntry?.probability ?? null,
        entryCount: bucket.entries.length,
        entries: bucket.entries.map((entry, index) => ({
          bucketIndex: bucket.bucketIndex,
          entryIndex: index + 1,
          address: entry.address,
          ensName: null,
          amount: entry.amount.toString(),
          amountEns: formatEns(entry.amount),
          probability: entry.probability,
        })),
      };
    }),
  };
}

export function getAddressReward(
  parsed: ParsedDistribution,
  rawAddress: string,
): AddressRewardBreakdown {
  const address = rawAddress.toLowerCase();
  let voterReward = 0n;
  let tokenHolderReward = 0n;
  let lotteryReward = 0n;
  let hadEligibilitySignal = false;
  let matchedReward: CombinedReward | null = null;

  for (const reward of parsed.result.rewards) {
    if (reward.address.toLowerCase() !== address) continue;
    voterReward += reward.voterReward;
    tokenHolderReward += reward.tokenHolderReward;
    hadEligibilitySignal = true;
    matchedReward ??= reward;
  }

  for (const bucket of parsed.result.lottery.buckets) {
    const winner = bucket.winner.toLowerCase();
    if (winner === address) {
      lotteryReward += bucket.prize;
      hadEligibilitySignal = true;
    }

    if (!hadEligibilitySignal) {
      hadEligibilitySignal = bucket.entries.some(
        (entry) => entry.address.toLowerCase() === address,
      );
    }
  }

  const totalReward = voterReward + tokenHolderReward + lotteryReward;
  const status = totalReward > 0n
    ? "paid"
    : hadEligibilitySignal
      ? "no_reward"
      : "not_eligible";

  return {
    address,
    voterReward: voterReward.toString(),
    voterRewardEns: formatEns(voterReward),
    tokenHolderReward: tokenHolderReward.toString(),
    tokenHolderRewardEns: formatEns(tokenHolderReward),
    lotteryReward: lotteryReward.toString(),
    lotteryRewardEns: formatEns(lotteryReward),
    totalReward: totalReward.toString(),
    totalRewardEns: formatEns(totalReward),
    status,
    provenance: buildRewardProvenance(parsed.result, matchedReward, status),
  };
}

/**
 * Build the provenance block for one wallet's direct rewards.
 *
 * Returns null when the persisted result_json predates provenance
 * persistence (no `metadata.provenanceVersion` — old rounds are never
 * recomputed) or when the wallet had no eligibility signal. Each role block
 * is present iff that role's final reward is positive; lottery winnings get
 * no provenance (seed/odds live in the lottery payload).
 */
function buildRewardProvenance(
  result: DistributionResult,
  matched: CombinedReward | null,
  status: AddressRewardBreakdown["status"],
): RewardProvenance | null {
  if (result.metadata.provenanceVersion == null) return null;
  if (status === "not_eligible") return null;

  const meta = result.metadata;

  let voter: VoterProvenanceDetail | null = null;
  if (matched && matched.voterReward > 0n && matched.voterProvenance) {
    const prov = matched.voterProvenance;
    voter = {
      avgVotingPower: prov.avgVotingPower.toString(),
      avgVotingPowerEns: formatEns(prov.avgVotingPower),
      poolSharePct: prov.poolSharePct,
      rawReward: prov.rawReward.toString(),
      rawRewardEns: formatEns(prov.rawReward),
      finalReward: matched.voterReward.toString(),
      finalRewardEns: formatEns(matched.voterReward),
      cap: meta.voterCap.toString(),
      capEns: formatEns(meta.voterCap),
      capStatus: prov.capStatus,
      redistributionReceived: prov.redistributionReceived.toString(),
      redistributionReceivedEns: formatEns(prov.redistributionReceived),
    };
  }

  let tokenHolder: TokenHolderProvenanceDetail | null = null;
  if (
    matched &&
    matched.tokenHolderReward > 0n &&
    matched.tokenHolderProvenance
  ) {
    const prov = matched.tokenHolderProvenance;
    tokenHolder = {
      avgBalance: matched.tokenHolderBalance.toString(),
      avgBalanceEns: formatEns(matched.tokenHolderBalance),
      poolSharePct: prov.poolSharePct,
      rawReward: prov.rawReward.toString(),
      rawRewardEns: formatEns(prov.rawReward),
      finalReward: matched.tokenHolderReward.toString(),
      finalRewardEns: formatEns(matched.tokenHolderReward),
      cap: meta.tokenHolderCap.toString(),
      capEns: formatEns(meta.tokenHolderCap),
      capStatus: prov.capStatus,
      redistributionReceived: prov.redistributionReceived.toString(),
      redistributionReceivedEns: formatEns(prov.redistributionReceived),
      sources: prov.sources ? [...prov.sources] : null,
    };
  }

  return { voter, tokenHolder };
}

export function getTopVoterRewards(
  parsed: ParsedDistribution,
  limit = 10,
): RewardRank[] {
  return parsed.result.rewards
    .filter((reward) => reward.voterReward > 0n)
    .sort((a, b) => compareBigIntDesc(a.voterReward, b.voterReward))
    .slice(0, limit)
    .map((reward, index) => ({
      rank: index + 1,
      address: reward.address,
      ensName: null,
      role: "voter",
      reward: reward.voterReward.toString(),
      rewardEns: formatEns(reward.voterReward),
      source: "direct",
      votingPower: null,
      tokenHolderBalance: null,
      delegationCount: null,
    }));
}

export function getTopTokenHolderRewards(
  parsed: ParsedDistribution,
  limit = 10,
): RewardRank[] {
  const totals = new Map<
    string,
    { direct: bigint; lottery: bigint; balance: bigint }
  >();

  for (const reward of parsed.result.rewards) {
    const tokenHolderReward = reward.tokenHolderReward;
    if (tokenHolderReward <= 0n) continue;
    const address = reward.address.toLowerCase();
    const existing = totals.get(address) ?? {
      direct: 0n,
      lottery: 0n,
      balance: 0n,
    };
    existing.direct += tokenHolderReward;
    existing.balance += reward.tokenHolderBalance;
    totals.set(address, existing);
  }

  for (const bucket of parsed.result.lottery.buckets) {
    const address = bucket.winner.toLowerCase();
    const existing = totals.get(address) ?? {
      direct: 0n,
      lottery: 0n,
      balance: 0n,
    };
    existing.lottery += bucket.prize;
    totals.set(address, existing);
  }

  return [...totals.entries()]
    .map(([address, rewards]) => {
      const reward = rewards.direct + rewards.lottery;
      const source: RewardRank["source"] = rewards.direct > 0n && rewards.lottery > 0n
        ? "combined"
        : rewards.lottery > 0n
          ? "lottery"
          : "direct";

      return {
        address,
        reward,
        source,
        balance: rewards.balance,
      };
    })
    .filter((entry) => entry.reward > 0n)
    .sort((a, b) => compareBigIntDesc(a.reward, b.reward))
    .slice(0, limit)
    .map((entry, index) => ({
      rank: index + 1,
      address: entry.address,
      ensName: null,
      role: "token_holder",
      reward: entry.reward.toString(),
      rewardEns: formatEns(entry.reward),
      source: entry.source,
      votingPower: null,
      tokenHolderBalance: entry.balance > 0n ? entry.balance.toString() : null,
      delegationCount: null,
    }));
}

function getTotalDistributed(result: DistributionResult): bigint {
  let totalDistributed = 0n;
  const minReward = MIN_REWARD_THRESHOLD;

  for (const reward of result.rewards) {
    if (reward.total >= minReward) {
      totalDistributed += reward.total;
    }
  }

  for (const bucket of result.lottery.buckets) {
    totalDistributed += bucket.prize;
  }

  return totalDistributed;
}

function getLotteryStats(result: DistributionResult) {
  const participants = new Set<string>();
  const winners = new Set<string>();
  let entryCount = 0;
  let totalPrize = 0n;

  for (const bucket of result.lottery.buckets) {
    totalPrize += bucket.prize;
    winners.add(bucket.winner.toLowerCase());

    for (const entry of bucket.entries) {
      entryCount += 1;
      participants.add(entry.address.toLowerCase());
    }
  }

  return {
    bucketCount: result.lottery.buckets.length,
    entryCount,
    participantCount: participants.size,
    winnerCount: winners.size,
    totalPrize,
  };
}

function computedAtToIso(value: DistributionStorageRow["computedAt"]): string {
  if (value == null) return new Date(0).toISOString();

  const numeric = typeof value === "bigint"
    ? Number(value)
    : typeof value === "string"
      ? Number(value)
      : value;

  if (!Number.isFinite(numeric)) return new Date(0).toISOString();

  const ms = numeric > 9_999_999_999 ? numeric : numeric * 1000;
  return new Date(ms).toISOString();
}

function compareBigIntDesc(a: bigint, b: bigint): number {
  if (a === b) return 0;
  return a > b ? -1 : 1;
}
