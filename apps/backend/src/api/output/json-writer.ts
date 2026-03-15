import { type DistributionResult } from "@ens-dis/domain";
import { bigintToString, weiToEnsString } from "./format.js";
import { getCachedEnsName } from "../ens-cache.js";

/**
 * Serialize a DistributionResult to a JSON string.
 * All BigInt values are converted to strings.
 */
export function distributionToJson(result: DistributionResult): string {
  const obj = {
    month: result.month,
    metadata: {
      totalDistributed: bigintToString(result.metadata.totalDistributed),
      totalDistributedEns: weiToEnsString(result.metadata.totalDistributed),
      poolTier: {
        momGrowthMinBps: bigintToString(result.metadata.poolTier.momGrowthMinBps),
        momGrowthMaxBps: bigintToString(result.metadata.poolTier.momGrowthMaxBps),
        poolSize: bigintToString(result.metadata.poolTier.poolSize),
        delegateCap: bigintToString(result.metadata.poolTier.delegateCap),
        delegatorCap: bigintToString(result.metadata.poolTier.delegatorCap),
      },
      momGrowthBps: bigintToString(result.metadata.momGrowthBps),
      activeDelegateCount: result.metadata.activeDelegateCount,
      eligibleDelegatorCount: result.metadata.eligibleDelegatorCount,
      computedAt: result.metadata.computedAt,
      randaoSeed: bigintToString(result.metadata.randaoSeed),
    },
    directPayouts: result.directPayouts.map((p) => ({
      address: p.address,
      ensName: getCachedEnsName(p.address),
      amount: bigintToString(p.amount),
      amountEns: weiToEnsString(p.amount),
      role: p.role,
    })),
    lotteryPools: result.lotteryPools.map((pool) => ({
      totalPrize: bigintToString(pool.totalPrize),
      totalPrizeEns: weiToEnsString(pool.totalPrize),
      winner: pool.winner,
      winnerEnsName: getCachedEnsName(pool.winner),
      entries: pool.entries.map((e) => ({
        address: e.address,
        ensName: getCachedEnsName(e.address),
        originalAmount: bigintToString(e.originalAmount),
        role: e.role,
      })),
    })),
  };

  return JSON.stringify(obj, null, 2);
}
