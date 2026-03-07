import { type DistributionResult } from "@/domain/types.js";
import { bigintToString, weiToEnsString } from "./format.js";

/**
 * Serialize a DistributionResult to a JSON string.
 * All BigInt values are converted to strings.
 */
export function distributionToJson(result: DistributionResult): string {
  const obj = {
    month: result.month,
    metadata: {
      totalDistributed: bigintToString(result.metadata.totalDistributed as bigint),
      totalDistributedEns: weiToEnsString(result.metadata.totalDistributed as bigint),
      poolTier: {
        momGrowthMinBps: bigintToString(result.metadata.poolTier.momGrowthMinBps as bigint),
        momGrowthMaxBps: bigintToString(result.metadata.poolTier.momGrowthMaxBps as bigint),
        poolSize: bigintToString(result.metadata.poolTier.poolSize as bigint),
        delegateCap: bigintToString(result.metadata.poolTier.delegateCap as bigint),
        delegatorCap: bigintToString(result.metadata.poolTier.delegatorCap as bigint),
      },
      momGrowthBps: bigintToString(result.metadata.momGrowthBps as bigint),
      activeDelegateCount: result.metadata.activeDelegateCount,
      eligibleDelegatorCount: result.metadata.eligibleDelegatorCount,
      computedAt: result.metadata.computedAt,
      randaoSeed: bigintToString(result.metadata.randaoSeed),
    },
    directPayouts: result.directPayouts.map((p) => ({
      address: p.address,
      amount: bigintToString(p.amount as bigint),
      amountEns: weiToEnsString(p.amount as bigint),
      role: p.role,
    })),
    lotteryPools: result.lotteryPools.map((pool) => ({
      totalPrize: bigintToString(pool.totalPrize as bigint),
      totalPrizeEns: weiToEnsString(pool.totalPrize as bigint),
      winner: pool.winner,
      entries: pool.entries.map((e) => ({
        address: e.address,
        originalAmount: bigintToString(e.originalAmount as bigint),
        role: e.role,
      })),
    })),
  };

  return JSON.stringify(obj, null, 2);
}
