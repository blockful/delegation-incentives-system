import { type Wei, type PoolTier } from "./types.js";
import { percentageGrowthBps } from "./util/bigint-math.js";

/**
 * Determine the pool tier based on month-over-month growth in
 * active delegated voting power.
 */
export function determinePoolTier(
  currentMonthAVP: Wei,
  previousMonthAVP: Wei,
  tierTable: readonly PoolTier[],
): PoolTier {
  const growthBps = percentageGrowthBps(currentMonthAVP, previousMonthAVP);

  // Find the matching tier (negative growth maps to lowest tier)
  for (const tier of tierTable) {
    if (
      growthBps >= tier.momGrowthMinBps &&
      growthBps < tier.momGrowthMaxBps
    ) {
      return tier;
    }
  }

  // If growth is negative or no tier matches, return lowest tier
  return tierTable[0];
}
