import { type DelegatorScore, type AllocationResult, wei } from "./types.js";
import { allocateWithCap } from "./cap-redistribution.js";
import { applyBasisPoints } from "@/util/bigint-math.js";
import { DELEGATOR_POOL_BPS } from "@/config.js";

/**
 * Compute delegator rewards.
 * - Sub-pool = 90% of monthly pool
 * - Weight = 180-day time-weighted balance
 * - Per-delegator cap = delegatorCap from the pool tier
 */
export function computeDelegatorRewards(
  delegatorScores: DelegatorScore[],
  monthlyPool: bigint,
  delegatorCap: bigint,
): AllocationResult[] {
  const delegatorPool = applyBasisPoints(monthlyPool, DELEGATOR_POOL_BPS);

  const inputs = delegatorScores.map((d) => ({
    id: d.delegatorId,
    weight: d.timeWeightedBalance,
  }));

  return allocateWithCap(inputs, delegatorPool, delegatorCap);
}
