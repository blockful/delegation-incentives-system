import {
  LOTTERY_BUCKET_TARGET,
  MIN_REWARD_THRESHOLD,
  POOL_TIERS,
  type CapStatus,
  type CombinedReward,
  type DistributionResult,
  type TokenHolderSource,
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

export function reviveDistributionResult(obj: any): DistributionResult {
  return {
    metadata: {
      ...obj.metadata,
      monthStart: BigInt(obj.metadata.monthStart),
      monthEnd: BigInt(obj.metadata.monthEnd),
      startBlock: BigInt(obj.metadata.startBlock),
      endBlock: BigInt(obj.metadata.endBlock),
      vpStart: BigInt(obj.metadata.vpStart),
      vpEnd: BigInt(obj.metadata.vpEnd),
      poolSize: BigInt(obj.metadata.poolSize),
      voterCap: BigInt(obj.metadata.voterCap),
      tokenHolderCap: BigInt(obj.metadata.tokenHolderCap),
    },
    rewards: obj.rewards.map((r: any) => ({
      ...r,
      voterReward: BigInt(r.voterReward),
      tokenHolderReward: BigInt(r.tokenHolderReward),
      // Backfill missing field on pre-feature JSON blobs so historic rounds
      // still load. Round detail UI shows "—" when this is 0.
      tokenHolderBalance: BigInt(r.tokenHolderBalance ?? "0"),
      total: BigInt(r.total),
      // Provenance is absent on blobs persisted before provenanceVersion 1.
      // Old rounds are never recomputed — the API exposes provenance: null.
      ...(r.voterProvenance && {
        voterProvenance: {
          ...r.voterProvenance,
          avgVotingPower: BigInt(r.voterProvenance.avgVotingPower),
          rawReward: BigInt(r.voterProvenance.rawReward),
          redistributionReceived: BigInt(
            r.voterProvenance.redistributionReceived,
          ),
        },
      }),
      ...(r.tokenHolderProvenance && {
        tokenHolderProvenance: {
          ...r.tokenHolderProvenance,
          rawReward: BigInt(r.tokenHolderProvenance.rawReward),
          redistributionReceived: BigInt(
            r.tokenHolderProvenance.redistributionReceived,
          ),
        },
      }),
    })),
    lottery: {
      buckets: obj.lottery.buckets.map((b: any) => ({
        ...b,
        prize: BigInt(b.prize),
        entries: b.entries.map((e: any) => ({
          ...e,
          amount: BigInt(e.amount),
        })),
      })),
    },
    deduplication: obj.deduplication,
  } as unknown as DistributionResult;
}

export function parseDistributionRow(row: DistributionStorageRow): ParsedDistribution {
  return {
    row,
    result: reviveDistributionResult(JSON.parse(row.resultJson)),
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
  const minReward = MIN_REWARD_THRESHOLD as bigint;

  const directPayouts = result.rewards
    .filter((r) => (r.total as bigint) >= minReward)
    .map((r) => {
      const role: "voter" | "token_holder" =
        (r.voterReward as bigint) > 0n ? "voter" : "token_holder";
      return {
        address: r.address,
        ensName: null as string | null,
        amount: (r.total as bigint).toString(),
        amountEns: formatEns(r.total as bigint),
        role,
      };
    });

  const lotteryPools = result.lottery.buckets.map((bucket) => ({
    totalPrize: (bucket.prize as bigint).toString(),
    totalPrizeEns: formatEns(bucket.prize as bigint),
    winner: bucket.winner,
    winnerEnsName: null as string | null,
    entries: bucket.entries.map((e) => ({
      address: e.address,
      ensName: null as string | null,
      originalAmount: (e.amount as bigint).toString(),
      role: "token_holder" as const,
    })),
  }));

  const totalDistributed = getTotalDistributed(result);
  const eligibleTokenHolderCount = result.rewards.filter(
    (r) => (r.tokenHolderReward as bigint) > 0n,
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
        poolSize: (tierConfig.poolSize as bigint).toString(),
        voterCap: (tierConfig.voterCap as bigint).toString(),
        tokenHolderCap: (tierConfig.tokenHolderCap as bigint).toString(),
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
    (r) => (r.tokenHolderReward as bigint) > 0n,
  ).length;
  const lotteryStats = getLotteryStats(result);

  return {
    month: meta.month,
    tierIndex: meta.tier,
    vpGrowthPct: meta.vpGrowthPct,
    poolSize: (meta.poolSize as bigint).toString(),
    poolSizeEns: formatEns(meta.poolSize as bigint),
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
      blockNumber: (meta.endBlock as bigint).toString(),
      algorithm: "keccak256(prevRandao, bucketIndex)",
    },
    bucketTarget: (LOTTERY_BUCKET_TARGET as bigint).toString(),
    bucketTargetEns: formatEns(LOTTERY_BUCKET_TARGET as bigint),
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
        prize: (bucket.prize as bigint).toString(),
        prizeEns: formatEns(bucket.prize as bigint),
        winner: bucket.winner,
        winnerEnsName: null,
        winnerProbability: winnerEntry?.probability ?? null,
        entryCount: bucket.entries.length,
        entries: bucket.entries.map((entry, index) => ({
          bucketIndex: bucket.bucketIndex,
          entryIndex: index + 1,
          address: entry.address,
          ensName: null,
          amount: (entry.amount as bigint).toString(),
          amountEns: formatEns(entry.amount as bigint),
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
    voterReward += reward.voterReward as bigint;
    tokenHolderReward += reward.tokenHolderReward as bigint;
    hadEligibilitySignal = true;
    matchedReward ??= reward;
  }

  for (const bucket of parsed.result.lottery.buckets) {
    const winner = bucket.winner.toLowerCase();
    if (winner === address) {
      lotteryReward += bucket.prize as bigint;
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
  if (
    matched &&
    (matched.voterReward as bigint) > 0n &&
    matched.voterProvenance
  ) {
    const prov = matched.voterProvenance;
    voter = {
      avgVotingPower: (prov.avgVotingPower as bigint).toString(),
      avgVotingPowerEns: formatEns(prov.avgVotingPower as bigint),
      poolSharePct: prov.poolSharePct,
      rawReward: (prov.rawReward as bigint).toString(),
      rawRewardEns: formatEns(prov.rawReward as bigint),
      finalReward: (matched.voterReward as bigint).toString(),
      finalRewardEns: formatEns(matched.voterReward as bigint),
      cap: (meta.voterCap as bigint).toString(),
      capEns: formatEns(meta.voterCap as bigint),
      capStatus: prov.capStatus,
      redistributionReceived: (
        prov.redistributionReceived as bigint
      ).toString(),
      redistributionReceivedEns: formatEns(
        prov.redistributionReceived as bigint,
      ),
    };
  }

  let tokenHolder: TokenHolderProvenanceDetail | null = null;
  if (
    matched &&
    (matched.tokenHolderReward as bigint) > 0n &&
    matched.tokenHolderProvenance
  ) {
    const prov = matched.tokenHolderProvenance;
    tokenHolder = {
      avgBalance: (matched.tokenHolderBalance as bigint).toString(),
      avgBalanceEns: formatEns(matched.tokenHolderBalance as bigint),
      poolSharePct: prov.poolSharePct,
      rawReward: (prov.rawReward as bigint).toString(),
      rawRewardEns: formatEns(prov.rawReward as bigint),
      finalReward: (matched.tokenHolderReward as bigint).toString(),
      finalRewardEns: formatEns(matched.tokenHolderReward as bigint),
      cap: (meta.tokenHolderCap as bigint).toString(),
      capEns: formatEns(meta.tokenHolderCap as bigint),
      capStatus: prov.capStatus,
      redistributionReceived: (
        prov.redistributionReceived as bigint
      ).toString(),
      redistributionReceivedEns: formatEns(
        prov.redistributionReceived as bigint,
      ),
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
    .filter((reward) => (reward.voterReward as bigint) > 0n)
    .sort((a, b) => compareBigIntDesc(a.voterReward as bigint, b.voterReward as bigint))
    .slice(0, limit)
    .map((reward, index) => ({
      rank: index + 1,
      address: reward.address,
      ensName: null,
      role: "voter",
      reward: (reward.voterReward as bigint).toString(),
      rewardEns: formatEns(reward.voterReward as bigint),
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
    const tokenHolderReward = reward.tokenHolderReward as bigint;
    if (tokenHolderReward <= 0n) continue;
    const address = reward.address.toLowerCase();
    const existing = totals.get(address) ?? {
      direct: 0n,
      lottery: 0n,
      balance: 0n,
    };
    existing.direct += tokenHolderReward;
    existing.balance += reward.tokenHolderBalance as bigint;
    totals.set(address, existing);
  }

  for (const bucket of parsed.result.lottery.buckets) {
    const address = bucket.winner.toLowerCase();
    const existing = totals.get(address) ?? {
      direct: 0n,
      lottery: 0n,
      balance: 0n,
    };
    existing.lottery += bucket.prize as bigint;
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
  const minReward = MIN_REWARD_THRESHOLD as bigint;

  for (const reward of result.rewards) {
    if ((reward.total as bigint) >= minReward) {
      totalDistributed += reward.total as bigint;
    }
  }

  for (const bucket of result.lottery.buckets) {
    totalDistributed += bucket.prize as bigint;
  }

  return totalDistributed;
}

function getLotteryStats(result: DistributionResult) {
  const participants = new Set<string>();
  const winners = new Set<string>();
  let entryCount = 0;
  let totalPrize = 0n;

  for (const bucket of result.lottery.buckets) {
    totalPrize += bucket.prize as bigint;
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
