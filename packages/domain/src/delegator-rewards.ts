import type { Address, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistribution } from "./cap-redistribution.js";
import { DELEGATOR_POOL_BPS, DELEGATOR_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum } from "./util/bigint-math.js";

/**
 * Allocate 90% of pool to delegators, proportional to their TWB.
 * Cap at 5% of R per delegator.
 *
 * @param delegatorTWBs - Map of delegator address to their Time-Weighted Balance
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for delegators
 */
export function computeDelegatorRewards(
  delegatorTWBs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  if (delegatorTWBs.size === 0) return [];

  const delegatorPool = wei(applyBps(poolSize, DELEGATOR_POOL_BPS));
  const delegatorCap = wei(applyBps(poolSize, DELEGATOR_CAP_BPS));

  // Total TWB across all delegators.
  const twbValues = [...delegatorTWBs.values()] as bigint[];
  const totalTWB = sum(twbValues);

  if (totalTWB === 0n) return [];

  // Compute raw (uncapped) allocations proportional to TWB.
  const rawAllocations: RewardAllocation[] = [];
  for (const [address, twb] of delegatorTWBs) {
    const rawReward = wei(mulDiv(twb, delegatorPool, totalTWB));
    rawAllocations.push({ address, reward: rawReward });
  }

  return applyCapRedistribution(
    rawAllocations,
    delegatorTWBs,
    delegatorCap,
    delegatorPool,
  );
}
