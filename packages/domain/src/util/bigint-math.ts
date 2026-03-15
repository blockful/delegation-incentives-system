/**
 * BigInt arithmetic utilities.
 * All functions are pure. No floating point anywhere.
 */

/** (a * b) / denominator — safe since JS BigInt has arbitrary precision */
export function mulDiv(a: bigint, b: bigint, denominator: bigint): bigint {
  if (denominator === 0n) throw new Error("Division by zero");
  return (a * b) / denominator;
}

/** (a * b + denominator - 1) / denominator — rounds up */
export function mulDivRoundUp(
  a: bigint,
  b: bigint,
  denominator: bigint,
): bigint {
  if (denominator === 0n) throw new Error("Division by zero");
  return (a * b + denominator - 1n) / denominator;
}

/** value * bps / 10000 */
export function applyBasisPoints(value: bigint, bps: bigint): bigint {
  return mulDiv(value, bps, 10000n);
}

/**
 * Compute month-over-month growth as basis points: ((current - previous) * 10000) / previous.
 *
 * Returns a **signed** value — negative when current < previous (VP declined).
 * `determinePoolTier` treats negative values as lowest-tier (tier 0).
 *
 * Special case: returns 10000 bps (100%) when previous is 0 and current > 0;
 * returns 0 when both are 0. Callers should guard against the previous === 0
 * case before using this for tier selection (see pipeline.ts bootstrap guard).
 */
export function percentageGrowthBps(
  current: bigint,
  previous: bigint,
): bigint {
  if (previous === 0n) {
    return current > 0n ? 100_00n : 0n; // 100% = 10000 bps, or 0 if both zero
  }
  return ((current - previous) * 10000n) / previous;
}

export function min(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}

export function max(a: bigint, b: bigint): bigint {
  return a > b ? a : b;
}

export function abs(a: bigint): bigint {
  return a < 0n ? -a : a;
}

export function sum(values: bigint[]): bigint {
  return values.reduce((acc, v) => acc + v, 0n);
}

/** Clamp value to [lower, upper] */
export function clamp(value: bigint, lower: bigint, upper: bigint): bigint {
  return max(lower, min(value, upper));
}
