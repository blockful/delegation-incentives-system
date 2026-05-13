import type { Address, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistribution } from "./cap-redistribution.js";
import { TOKEN_HOLDER_POOL_BPS, TOKEN_HOLDER_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum } from "./util/bigint-math.js";

/**
 * Allocate 90% of pool to eligible token holders, proportional to their TWB.
 * Cap at 5% of R per token holder.
 *
 * @param tokenHolderTWBs - Map of token-holder address to their Time-Weighted Balance
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for token holders
 */
export function computeTokenHolderRewards(
  tokenHolderTWBs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  if (tokenHolderTWBs.size === 0) return [];

  const tokenHolderSubPool = wei(applyBps(poolSize, TOKEN_HOLDER_POOL_BPS));
  const tokenHolderCap = wei(applyBps(poolSize, TOKEN_HOLDER_CAP_BPS));

  const twbValues = [...tokenHolderTWBs.values()] as bigint[];
  const totalTWB = sum(twbValues);

  if (totalTWB === 0n) return [];

  const rawAllocations: RewardAllocation[] = [];
  for (const [address, twb] of tokenHolderTWBs) {
    const rawReward = wei(mulDiv(twb, tokenHolderSubPool, totalTWB));
    rawAllocations.push({ address, reward: rawReward });
  }

  return applyCapRedistribution(
    rawAllocations,
    tokenHolderTWBs,
    tokenHolderCap,
    tokenHolderSubPool,
  );
}
