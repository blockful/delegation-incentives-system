import {
  type PoolTier,
  type Wei,
  type BasisPoints,
  wei,
  basisPoints,
  ONE_ENS,
} from "./types.js";

// --- Pool tier table ---

function tier(
  momGrowthMinPct: number,
  momGrowthMaxPct: number,
  poolEns: bigint,
  delegateCapEns: bigint,
  delegatorCapEns: bigint,
): PoolTier {
  return {
    momGrowthMinBps: basisPoints(BigInt(momGrowthMinPct * 100)),
    momGrowthMaxBps: basisPoints(BigInt(momGrowthMaxPct * 100)),
    poolSize: wei(poolEns * ONE_ENS),
    delegateCap: wei(delegateCapEns * ONE_ENS),
    delegatorCap: wei(delegatorCapEns * ONE_ENS),
  };
}

export const POOL_TIERS: readonly PoolTier[] = [
  tier(0, 10, 5_000n, 50n, 250n),
  tier(10, 20, 8_000n, 80n, 400n),
  tier(20, 30, 10_000n, 100n, 500n),
  tier(30, 50, 15_000n, 150n, 750n),
  tier(50, 75, 20_000n, 200n, 1_000n),
  tier(75, 100, 25_000n, 250n, 1_250n),
  tier(100, 1_000_000, 30_000n, 300n, 1_500n), // 100%+ (effectively infinite upper bound)
];

// --- Tier table validation (runs once at module load) ---
// Catches configuration errors before any distribution is computed.

function validateTierTable(tiers: readonly PoolTier[]): void {
  if (tiers.length === 0) throw new Error("POOL_TIERS must not be empty");

  for (let i = 0; i < tiers.length; i++) {
    const t = tiers[i];
    if (t.poolSize <= 0n) throw new Error(`Tier ${i}: poolSize must be positive`);
    if (t.delegateCap <= 0n) throw new Error(`Tier ${i}: delegateCap must be positive`);
    if (t.delegatorCap <= 0n) throw new Error(`Tier ${i}: delegatorCap must be positive`);
    if (t.momGrowthMinBps >= t.momGrowthMaxBps)
      throw new Error(`Tier ${i}: minBps (${t.momGrowthMinBps}) must be < maxBps (${t.momGrowthMaxBps})`);

    // Tiers must be contiguous: tier[i].maxBps === tier[i+1].minBps
    if (i > 0) {
      const prev = tiers[i - 1];
      if (prev.momGrowthMaxBps !== t.momGrowthMinBps)
        throw new Error(
          `Tier gap between tier ${i - 1} and ${i}: ` +
          `prev.maxBps=${prev.momGrowthMaxBps}, current.minBps=${t.momGrowthMinBps}`,
        );
    }
  }

  // First tier must start at 0 bps
  if (tiers[0].momGrowthMinBps !== 0n)
    throw new Error(`First tier must start at 0 bps, got ${tiers[0].momGrowthMinBps}`);
}

validateTierTable(POOL_TIERS);

/** Delegate pool is 10% of monthly pool */
export const DELEGATE_POOL_BPS = basisPoints(1000n); // 10%

/** Delegator pool is 90% of monthly pool */
export const DELEGATOR_POOL_BPS = basisPoints(9000n); // 90%

/** Minimum payout threshold before entering lottery (1 ENS) */
export const MIN_PAYOUT_THRESHOLD: Wei = ONE_ENS;

/** Target lottery pool size (~10 ENS) */
export const LOTTERY_TARGET_POOL_SIZE: Wei = wei(10n * ONE_ENS);

