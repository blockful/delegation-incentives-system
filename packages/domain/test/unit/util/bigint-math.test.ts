import { describe, it, expect } from "vitest";
import {
  sum,
  mulDiv,
  applyBps,
  percentageGrowthBps,
  abs,
  min,
  max,
} from "../../../src/util/bigint-math.js";

// ---------------------------------------------------------------------------
// sum
// ---------------------------------------------------------------------------
describe("sum", () => {
  it("returns 0n for an empty array", () => {
    expect(sum([])).toBe(0n);
  });

  it("returns the element for a single-element array", () => {
    expect(sum([42n])).toBe(42n);
  });

  it("sums multiple positive values", () => {
    expect(sum([1n, 2n, 3n, 4n])).toBe(10n);
  });

  it("handles negative values", () => {
    expect(sum([10n, -3n, -7n])).toBe(0n);
  });

  it("handles a mix of large positive and negative values", () => {
    expect(sum([10n ** 18n, -(10n ** 18n)])).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// mulDiv
// ---------------------------------------------------------------------------
describe("mulDiv", () => {
  it("computes basic multiplication then division", () => {
    // (6 * 7) / 3 = 14
    expect(mulDiv(6n, 7n, 3n)).toBe(14n);
  });

  it("truncates toward zero", () => {
    // (7 * 2) / 3 = 14/3 = 4 (truncated)
    expect(mulDiv(7n, 2n, 3n)).toBe(4n);
  });

  it("works with large numbers without overflow", () => {
    const a = 10n ** 18n; // 1 ETH in wei
    const b = 5000n; // bps
    const denom = 10_000n;
    // (1e18 * 5000) / 10000 = 5e17
    expect(mulDiv(a, b, denom)).toBe(5n * 10n ** 17n);
  });

  it("returns 0n when numerator product is smaller than denominator", () => {
    expect(mulDiv(1n, 1n, 3n)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// applyBps
// ---------------------------------------------------------------------------
describe("applyBps", () => {
  it("applies 10% (1000 bps)", () => {
    expect(applyBps(1_000_000n, 1_000n)).toBe(100_000n);
  });

  it("applies 100% (10000 bps)", () => {
    expect(applyBps(1_000_000n, 10_000n)).toBe(1_000_000n);
  });

  it("applies 0% (0 bps)", () => {
    expect(applyBps(1_000_000n, 0n)).toBe(0n);
  });

  it("accepts a custom base", () => {
    // 50% with base 100
    expect(applyBps(200n, 50n, 100n)).toBe(100n);
  });
});

// ---------------------------------------------------------------------------
// percentageGrowthBps
// ---------------------------------------------------------------------------
describe("percentageGrowthBps", () => {
  it("returns positive growth in bps", () => {
    // 100 -> 150 = 50% = 5000 bps
    expect(percentageGrowthBps(100n, 150n)).toBe(5_000n);
  });

  it("returns negative growth in bps", () => {
    // 200 -> 100 = -50% = -5000 bps
    expect(percentageGrowthBps(200n, 100n)).toBe(-5_000n);
  });

  it("returns 0n when before is 0n", () => {
    expect(percentageGrowthBps(0n, 500n)).toBe(0n);
  });

  it("returns 0n when there is no growth", () => {
    expect(percentageGrowthBps(100n, 100n)).toBe(0n);
  });

  it("handles 100% growth (doubling)", () => {
    expect(percentageGrowthBps(100n, 200n)).toBe(10_000n);
  });
});

// ---------------------------------------------------------------------------
// abs
// ---------------------------------------------------------------------------
describe("abs", () => {
  it("returns the same value for a positive number", () => {
    expect(abs(42n)).toBe(42n);
  });

  it("negates a negative number", () => {
    expect(abs(-42n)).toBe(42n);
  });

  it("returns 0n for zero", () => {
    expect(abs(0n)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// min / max
// ---------------------------------------------------------------------------
describe("min", () => {
  it("returns the smaller value", () => {
    expect(min(3n, 7n)).toBe(3n);
  });

  it("works when arguments are equal", () => {
    expect(min(5n, 5n)).toBe(5n);
  });

  it("handles negative values", () => {
    expect(min(-10n, 1n)).toBe(-10n);
  });
});

describe("max", () => {
  it("returns the larger value", () => {
    expect(max(3n, 7n)).toBe(7n);
  });

  it("works when arguments are equal", () => {
    expect(max(5n, 5n)).toBe(5n);
  });

  it("handles negative values", () => {
    expect(max(-10n, 1n)).toBe(1n);
  });
});
