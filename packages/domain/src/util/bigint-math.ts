/**
 * Pure BigInt arithmetic utilities for incentive calculations.
 */

/** Sum all values in the array. Returns 0n for an empty array. */
export function sum(values: bigint[]): bigint {
  let total = 0n;
  for (const v of values) {
    total += v;
  }
  return total;
}

/** (a * b) / denominator, truncating toward zero. */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  return (a * b) / denominator;
}

/**
 * Apply a basis-point multiplier: (value * bps) / base.
 * Default base is 10_000n (100% = 10 000 bps).
 */
export function applyBps(
  value: bigint,
  bps: bigint,
  base: bigint = 10_000n,
): bigint {
  return (value * bps) / base;
}

/**
 * Percentage growth expressed in basis points:
 *   ((after - before) * 10_000n) / before
 *
 * Returns 0n when before is 0n (avoids division by zero).
 */
export function percentageGrowthBps(before: bigint, after: bigint): bigint {
  if (before === 0n) return 0n;
  return ((after - before) * 10_000n) / before;
}

/**
 * Format `part / total` as a percent string with 2 decimals (e.g. "3.21"),
 * truncating toward zero — same style as `vpGrowthPct`.
 * Returns "0.00" when total is 0n.
 */
export function formatShareAsPct(part: bigint, total: bigint): string {
  if (total === 0n) return "0.00";
  const bps = (part * 10_000n) / total;
  const whole = bps / 100n;
  const frac = abs(bps % 100n);
  return `${whole}.${frac.toString().padStart(2, "0")}`;
}

/** Absolute value of a bigint. */
export function abs(n: bigint): bigint {
  return n < 0n ? -n : n;
}

/** Smaller of two bigints. */
export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

/** Larger of two bigints. */
export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}
