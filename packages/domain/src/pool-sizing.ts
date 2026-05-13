import type { PoolTier, Wei } from "./types.js";
import { POOL_TIERS } from "./config.js";

/**
 * Compute VP growth as a percentage: ((vpEnd - vpStart) / vpStart) * 100.
 * Returns a number (e.g., 15.5 for 15.5% growth).
 * Returns 0 if vpStart is 0.
 */
export function computeVpGrowthPct(vpStart: Wei, vpEnd: Wei): number {
  if (vpStart === 0n) return 0;

  // Multiply by 10_000 first, then divide by 100 to get percentage with 2 decimal places.
  return Number((vpEnd - vpStart) * 10_000n / vpStart) / 100;
}

/**
 * Select the pool tier based on VP growth percentage.
 * Negative growth maps to the first tier (0-10%).
 * Returns the matching PoolTier including poolSize, voterCap, tokenHolderCap.
 */
export function selectPoolTier(growthPct: number): PoolTier {
  if (growthPct < 0) return POOL_TIERS[0];

  for (const tier of POOL_TIERS) {
    if (growthPct >= tier.minGrowthPct && growthPct < tier.maxGrowthPct) {
      return tier;
    }
  }

  // Fallback: last tier (should not be reached since last tier has maxGrowthPct = Infinity).
  return POOL_TIERS[POOL_TIERS.length - 1];
}
