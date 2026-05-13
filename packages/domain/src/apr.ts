import type { PoolTier, Wei } from "./types.js";
import { wei } from "./types.js";
import { TOKEN_HOLDER_POOL_BPS } from "./config.js";
import { applyBps } from "./util/bigint-math.js";

/**
 * Annualize a monthly reward as APR (no compounding):
 * monthly × 12 × 100 / share, scaled by 100 for two-decimal precision in
 * integer math. Returns "0.00" when either input is 0.
 */
export function estimateAprPct(monthlyReward: Wei, share: Wei): string {
  const reward = monthlyReward as bigint;
  const denom = share as bigint;
  if (reward === 0n || denom === 0n) return "0.00";
  const scaled = (reward * 1200n * 100n) / denom;
  return (Number(scaled) / 100).toFixed(2);
}

/**
 * Token-holder APR at a tier, using the VP that would exist when the tier is
 * reached: vpStart × (1 + minGrowthPct/100). Using current spot VP would
 * over-promise — every tier above the current one assumes growth that hasn't
 * happened yet, and a smaller denominator inflates the displayed APR.
 */
export function computeTierAprPct(tier: PoolTier, vpStart: Wei): string {
  const vpStartBig = vpStart as bigint;
  if (vpStartBig === 0n) return "0.00";
  const tierVp = wei(
    (vpStartBig * (100n + BigInt(tier.minGrowthPct))) / 100n,
  );
  const tokenHolderSubPool = wei(
    applyBps(tier.poolSize as bigint, TOKEN_HOLDER_POOL_BPS as bigint),
  );
  return estimateAprPct(tokenHolderSubPool, tierVp);
}
