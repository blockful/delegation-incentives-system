import { describe, it, expect } from "vitest";
import {
  mulDiv,
  mulDivRoundUp,
  applyBasisPoints,
  percentageGrowthBps,
  min,
  max,
  abs,
  sum,
  clamp,
} from "@/util/bigint-math.js";

describe("mulDiv", () => {
  it("computes (a * b) / denominator", () => {
    expect(mulDiv(100n, 200n, 10n)).toBe(2000n);
  });

  it("truncates toward zero", () => {
    expect(mulDiv(10n, 3n, 4n)).toBe(7n); // 30/4 = 7.5 → 7
  });

  it("handles large values without overflow", () => {
    const large = 10n ** 36n;
    expect(mulDiv(large, large, large)).toBe(large);
  });

  it("throws on zero denominator", () => {
    expect(() => mulDiv(1n, 1n, 0n)).toThrow("Division by zero");
  });

  it("returns 0 when numerator is 0", () => {
    expect(mulDiv(0n, 100n, 50n)).toBe(0n);
  });
});

describe("mulDivRoundUp", () => {
  it("rounds up when there is a remainder", () => {
    expect(mulDivRoundUp(10n, 3n, 4n)).toBe(8n); // 30/4 = 7.5 → 8
  });

  it("does not round up when exact", () => {
    expect(mulDivRoundUp(10n, 4n, 4n)).toBe(10n);
  });

  it("throws on zero denominator", () => {
    expect(() => mulDivRoundUp(1n, 1n, 0n)).toThrow("Division by zero");
  });
});

describe("applyBasisPoints", () => {
  it("computes 10% (1000 bps)", () => {
    const pool = 10000n * 10n ** 18n; // 10,000 ENS
    const result = applyBasisPoints(pool, 1000n);
    expect(result).toBe(1000n * 10n ** 18n); // 1,000 ENS
  });

  it("computes 90% (9000 bps)", () => {
    const pool = 10000n * 10n ** 18n;
    const result = applyBasisPoints(pool, 9000n);
    expect(result).toBe(9000n * 10n ** 18n);
  });

  it("computes 100% (10000 bps)", () => {
    expect(applyBasisPoints(500n, 10000n)).toBe(500n);
  });

  it("handles 0 bps", () => {
    expect(applyBasisPoints(1000n, 0n)).toBe(0n);
  });

  it("truncates down on odd pool (10% + 90% < 100% by at most 1 wei)", () => {
    // Odd pool: 10_001 wei
    const pool = 10_001n;
    const d10 = applyBasisPoints(pool, 1000n);  // 10%
    const d90 = applyBasisPoints(pool, 9000n);  // 90%
    // Each truncates independently: 10_001 * 1000 / 10000 = 1_000 (exact)
    //                                10_001 * 9000 / 10000 = 9_000 (truncated from 9000.9)
    expect(d10).toBe(1_000n);
    expect(d90).toBe(9_000n);
    // At most 1 wei rounding loss total (acceptable for 18-decimal token values)
    expect(pool - d10 - d90).toBeLessThanOrEqual(1n);
    expect(pool - d10 - d90).toBeGreaterThanOrEqual(0n);
  });

  it("rounding loss is negligible at ENS precision (18 decimals)", () => {
    // Worst-case odd pool in ENS: 10_001 * 10^18 + 1
    const ONE_ENS = 10n ** 18n;
    const pool = 10_001n * ONE_ENS + 1n;
    const d10 = applyBasisPoints(pool, 1000n);
    const d90 = applyBasisPoints(pool, 9000n);
    const loss = pool - d10 - d90;
    // Loss is at most 1 wei — negligible vs millions of ENS
    expect(loss).toBeLessThanOrEqual(1n);
    expect(loss).toBeGreaterThanOrEqual(0n);
  });
});

describe("percentageGrowthBps", () => {
  it("returns 0 for no growth", () => {
    expect(percentageGrowthBps(100n, 100n)).toBe(0n);
  });

  it("returns 10000 for 100% growth", () => {
    expect(percentageGrowthBps(200n, 100n)).toBe(10000n);
  });

  it("returns 5000 for 50% growth", () => {
    expect(percentageGrowthBps(150n, 100n)).toBe(5000n);
  });

  it("returns negative for decline", () => {
    expect(percentageGrowthBps(80n, 100n)).toBe(-2000n); // -20%
  });

  it("handles zero previous (returns 10000 for 100%+ if current > 0)", () => {
    expect(percentageGrowthBps(100n, 0n)).toBe(10000n);
  });

  it("handles both zero", () => {
    expect(percentageGrowthBps(0n, 0n)).toBe(0n);
  });
});

describe("min / max / abs", () => {
  it("min returns smaller value", () => {
    expect(min(3n, 5n)).toBe(3n);
    expect(min(5n, 3n)).toBe(3n);
    expect(min(3n, 3n)).toBe(3n);
  });

  it("max returns larger value", () => {
    expect(max(3n, 5n)).toBe(5n);
    expect(max(5n, 3n)).toBe(5n);
  });

  it("abs returns absolute value", () => {
    expect(abs(-5n)).toBe(5n);
    expect(abs(5n)).toBe(5n);
    expect(abs(0n)).toBe(0n);
  });
});

describe("sum", () => {
  it("sums an array of BigInts", () => {
    expect(sum([1n, 2n, 3n, 4n])).toBe(10n);
  });

  it("returns 0 for empty array", () => {
    expect(sum([])).toBe(0n);
  });

  it("handles single element", () => {
    expect(sum([42n])).toBe(42n);
  });
});

describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5n, 1n, 10n)).toBe(5n);
  });

  it("clamps to lower bound", () => {
    expect(clamp(-1n, 0n, 10n)).toBe(0n);
  });

  it("clamps to upper bound", () => {
    expect(clamp(15n, 0n, 10n)).toBe(10n);
  });
});
