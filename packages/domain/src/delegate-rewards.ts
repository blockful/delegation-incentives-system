import type { Address, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistribution } from "./cap-redistribution.js";
import { DELEGATE_POOL_BPS, DELEGATE_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum } from "./util/bigint-math.js";

/**
 * Allocate 10% of pool to active delegates, proportional to their TWAP VP.
 * Cap at 1% of R per delegate.
 *
 * @param delegateTWAPs - Map of delegate address to their TWAP voting power
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for delegates
 */
export function computeDelegateRewards(
  delegateTWAPs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  if (delegateTWAPs.size === 0) return [];

  const delegatePool = wei(applyBps(poolSize, DELEGATE_POOL_BPS));
  const delegateCap = wei(applyBps(poolSize, DELEGATE_CAP_BPS));

  // Total TWAP across all delegates.
  const twapValues = [...delegateTWAPs.values()] as bigint[];
  const totalTWAP = sum(twapValues);

  if (totalTWAP === 0n) return [];

  // Compute raw (uncapped) allocations proportional to TWAP.
  const rawAllocations: RewardAllocation[] = [];
  for (const [address, twap] of delegateTWAPs) {
    const rawReward = wei(mulDiv(twap, delegatePool, totalTWAP));
    rawAllocations.push({ address, reward: rawReward });
  }

  return applyCapRedistribution(
    rawAllocations,
    delegateTWAPs,
    delegateCap,
    delegatePool,
  );
}
