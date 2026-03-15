import { z } from "zod/v4";
import {
  type PoolTier,
  type Wei,
  type BasisPoints,
  wei,
  basisPoints,
  ONE_ENS,
} from "@/domain/types.js";

// --- Environment config ---

export const envSchema = z.object({
  DATABASE_URL: z.string(),
  BACKEND_PORT: z.coerce.number().default(3000),
});

export type EnvConfig = z.infer<typeof envSchema>;

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

/** Delegate pool is 10% of monthly pool */
export const DELEGATE_POOL_BPS = basisPoints(1000n); // 10%

/** Delegator pool is 90% of monthly pool */
export const DELEGATOR_POOL_BPS = basisPoints(9000n); // 90%

/** Per-delegate cap: 1% of total monthly pool */
export const DELEGATE_CAP_PERCENT = 1n;

/** Per-delegator cap: 5% of total monthly pool */
export const DELEGATOR_CAP_PERCENT = 5n;

/** Minimum payout threshold before entering lottery (1 ENS) */
export const MIN_PAYOUT_THRESHOLD: Wei = ONE_ENS;

/** Target lottery pool size (~10 ENS) */
export const LOTTERY_TARGET_POOL_SIZE: Wei = wei(10n * ONE_ENS);
