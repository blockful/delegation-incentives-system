import type { BasisPoints, PoolTier, Seconds, Wei } from "./types.js";
import { bps, seconds, wei } from "./types.js";

// ──────────────────────────────────────────────────────────
// Activity thresholds
// ──────────────────────────────────────────────────────────

/** Minimum votes in the proposal window to qualify as an active voter. */
export const ACTIVE_VOTE_THRESHOLD = 7;

/** Number of recent finalized proposals considered for activity. */
export const PROPOSAL_WINDOW_SIZE = 10;

// ──────────────────────────────────────────────────────────
// Pool split (basis points, 10 000 = 100%)
// ──────────────────────────────────────────────────────────

export const BPS_BASE: BasisPoints = bps(10_000n);

/** 10% of monthly pool goes to active voters. */
export const VOTER_POOL_BPS: BasisPoints = bps(1_000n);

/** 90% of monthly pool goes to eligible token holders. */
export const TOKEN_HOLDER_POOL_BPS: BasisPoints = bps(9_000n);

/** Per-voter cap = 1% of pool. */
export const VOTER_CAP_BPS: BasisPoints = bps(100n);

/** Per-token-holder cap = 5% of pool. */
export const TOKEN_HOLDER_CAP_BPS: BasisPoints = bps(500n);

// ──────────────────────────────────────────────────────────
// Time-Weighted Balance window
// ──────────────────────────────────────────────────────────

/** 180 days in seconds (180 * 24 * 3600 = 15 552 000). */
export const TWB_WINDOW_SECONDS: Seconds = seconds(15_552_000n);

// ──────────────────────────────────────────────────────────
// Provenance
// ──────────────────────────────────────────────────────────

/**
 * Version of the per-wallet reward provenance persisted in result_json.
 * Old blobs without `metadata.provenanceVersion` expose `provenance: null`
 * on the API — they are never recomputed.
 */
export const PROVENANCE_VERSION = 1;

// ──────────────────────────────────────────────────────────
// Reward thresholds
// ──────────────────────────────────────────────────────────

const ENS = 10n ** 18n;

/** Minimum combined reward for a direct payout (1 ENS). */
export const MIN_REWARD_THRESHOLD: Wei = wei(1n * ENS);

/** Target size for lottery buckets (10 ENS). */
export const LOTTERY_BUCKET_TARGET: Wei = wei(10n * ENS);

// ──────────────────────────────────────────────────────────
// Pool tier table
// ──────────────────────────────────────────────────────────

function tier(
  minGrowthPct: number,
  maxGrowthPct: number,
  poolEns: bigint,
): PoolTier {
  const poolSize = wei(poolEns * ENS);
  const voterCap = wei((poolEns * ENS) / 100n);
  const tokenHolderCap = wei((poolEns * ENS * 5n) / 100n);
  return { minGrowthPct, maxGrowthPct, poolSize, voterCap, tokenHolderCap };
}

/**
 * Seven tiers mapping VP growth to pool size.
 * Negative growth maps to the first tier (0-10%).
 */
export const POOL_TIERS: readonly PoolTier[] = [
  tier(0, 10, 5_000n),
  tier(10, 20, 8_000n),
  tier(20, 30, 10_000n),
  tier(30, 50, 15_000n),
  tier(50, 75, 20_000n),
  tier(75, 100, 25_000n),
  tier(100, Infinity, 30_000n),
] as const;
