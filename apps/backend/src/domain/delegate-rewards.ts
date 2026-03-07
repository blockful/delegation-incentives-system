import { type DelegateScore, type AllocationResult, wei } from "./types.js";
import { allocateWithCap } from "./cap-redistribution.js";
import { applyBasisPoints } from "@/util/bigint-math.js";
import { DELEGATE_POOL_BPS } from "@/config.js";

/**
 * Compute delegate rewards.
 * - Sub-pool = 10% of monthly pool
 * - Weight = average voting power during the month
 * - Per-delegate cap = delegateCap from the pool tier
 */
export function computeDelegateRewards(
  activeDelegates: DelegateScore[],
  monthlyPool: bigint,
  delegateCap: bigint,
): AllocationResult[] {
  const delegatePool = applyBasisPoints(monthlyPool, DELEGATE_POOL_BPS);

  const inputs = activeDelegates
    .filter((d) => d.isActive)
    .map((d) => ({
      id: d.delegateId,
      weight: d.averageVotingPower,
    }));

  return allocateWithCap(inputs, delegatePool, delegateCap);
}
