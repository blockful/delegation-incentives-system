import type { Address, Wei, RewardAllocation } from "./types.js";
import { wei } from "./types.js";
import { applyCapRedistribution } from "./cap-redistribution.js";
import { VOTER_POOL_BPS, VOTER_CAP_BPS } from "./config.js";
import { mulDiv, applyBps, sum } from "./util/bigint-math.js";

/**
 * Allocate 10% of pool to active voters, proportional to their AVP (TWAP VP).
 * Cap at 1% of R per voter.
 *
 * @param voterAVPs - Map of voter address to their AVP (Time-Weighted Average Voting Power)
 * @param poolSize - Total reward pool size (R)
 * @returns Capped reward allocations for active voters
 */
export function computeVoterRewards(
  voterAVPs: ReadonlyMap<Address, Wei>,
  poolSize: Wei,
): RewardAllocation[] {
  if (voterAVPs.size === 0) return [];

  const voterSubPool = wei(applyBps(poolSize, VOTER_POOL_BPS));
  const voterCap = wei(applyBps(poolSize, VOTER_CAP_BPS));

  const avpValues = [...voterAVPs.values()] as bigint[];
  const totalAVP = sum(avpValues);

  if (totalAVP === 0n) return [];

  const rawAllocations: RewardAllocation[] = [];
  for (const [address, avp] of voterAVPs) {
    const rawReward = wei(mulDiv(avp, voterSubPool, totalAVP));
    rawAllocations.push({ address, reward: rawReward });
  }

  return applyCapRedistribution(
    rawAllocations,
    voterAVPs,
    voterCap,
    voterSubPool,
  );
}
