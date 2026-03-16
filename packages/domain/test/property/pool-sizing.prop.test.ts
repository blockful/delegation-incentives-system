import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { determinePoolTier } from "@/pool-sizing.js";
import { percentageGrowthBps } from "@/util/bigint-math.js";
import { POOL_TIERS } from "@/config.js";
import { wei } from "@/types.js";

const vpArb = fc.bigInt({ min: 1n, max: 10n ** 24n });

describe("percentageGrowthBps property tests", () => {
  it("previous=0, current>0 → 10000 bps (100%)", () => {
    fc.assert(
      fc.property(fc.bigInt({ min: 1n, max: 10n ** 24n }), (current) => {
        expect(percentageGrowthBps(current, 0n)).toBe(10000n);
      }),
      { numRuns: 100 },
    );
  });

  it("both zero → 0 bps", () => {
    expect(percentageGrowthBps(0n, 0n)).toBe(0n);
  });

  it("current=previous → 0 bps (0% growth)", () => {
    fc.assert(
      fc.property(vpArb, (value) => {
        expect(percentageGrowthBps(value, value)).toBe(0n);
      }),
      { numRuns: 100 },
    );
  });

  it("current > previous → positive bps (when growth is large enough to avoid truncation)", () => {
    // percentageGrowthBps = (current - previous) * 10000 / previous
    // This rounds to 0 when (current - previous) * 10000 < previous.
    // We ensure current >= previous * 2 so growth >= 100% which always gives bps >= 10000.
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 12n }),
        (previous) => {
          const current = previous * 2n; // 100% growth, guaranteed positive bps
          expect(percentageGrowthBps(current, previous)).toBeGreaterThan(0n);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("current < previous → negative bps", () => {
    fc.assert(
      fc.property(vpArb, vpArb, (a, b) => {
        fc.pre(a !== b);
        const current = a < b ? a : b;
        const previous = a < b ? b : a;
        expect(percentageGrowthBps(current, previous)).toBeLessThan(0n);
      }),
      { numRuns: 100 },
    );
  });

  it("exact: percentageGrowthBps(200n, 100n) === 10000n (100% growth)", () => {
    expect(percentageGrowthBps(200n, 100n)).toBe(10000n);
  });

  it("exact: percentageGrowthBps(110n, 100n) === 1000n (10% growth)", () => {
    expect(percentageGrowthBps(110n, 100n)).toBe(1000n);
  });
});

describe("determinePoolTier property tests", () => {
  it("always returns a tier from POOL_TIERS", () => {
    fc.assert(
      fc.property(vpArb, vpArb, (current, previous) => {
        const result = determinePoolTier(wei(current), wei(previous), POOL_TIERS);
        const found = POOL_TIERS.some((t) => t === result);
        expect(found).toBe(true);
      }),
      { numRuns: 200 },
    );
  });

  it("negative growth → tier 0 (lowest tier)", () => {
    fc.assert(
      fc.property(vpArb, vpArb, (a, b) => {
        fc.pre(a !== b);
        const current = wei(a < b ? a : b);
        const previous = wei(a < b ? b : a);
        // current < previous means negative growth
        const result = determinePoolTier(current, previous, POOL_TIERS);
        expect(result).toBe(POOL_TIERS[0]);
      }),
      { numRuns: 200 },
    );
  });

  it("higher growth → equal or higher pool size (monotonicity for positive growth)", () => {
    // For any two positive growth values, the one with higher growth should
    // get an equal or higher pool tier. This is now unconditionally true
    // after fixing the extreme-growth fallback to return the highest tier.
    const smallBase = 10_000n;
    const smallGrowthArb = fc.bigInt({ min: 1n, max: 9_999n });

    fc.assert(
      fc.property(
        smallGrowthArb,
        smallGrowthArb,
        (growthA, growthB) => {
          fc.pre(growthA !== growthB);
          const currentA = wei(smallBase + growthA);
          const currentB = wei(smallBase + growthB);
          const previous = wei(smallBase);

          const tierA = determinePoolTier(currentA, previous, POOL_TIERS);
          const tierB = determinePoolTier(currentB, previous, POOL_TIERS);

          const bpsA = percentageGrowthBps(smallBase + growthA, smallBase);
          const bpsB = percentageGrowthBps(smallBase + growthB, smallBase);

          if (bpsA >= bpsB) {
            expect(tierA.poolSize as bigint).toBeGreaterThanOrEqual(
              tierB.poolSize as bigint,
            );
          } else {
            expect(tierB.poolSize as bigint).toBeGreaterThanOrEqual(
              tierA.poolSize as bigint,
            );
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("bootstrap previous=0 guard: determinePoolTier(X, 0) uses 10000 bps and returns a high tier", () => {
    fc.assert(
      fc.property(vpArb, (current) => {
        // When previous=0, percentageGrowthBps returns 10000 bps (100%)
        // This should map to the tier that covers [100%, infinity) — the last tier
        const result = determinePoolTier(wei(current), wei(0n), POOL_TIERS);
        // With 10000 bps growth, should be at least the tier for 100%+ growth
        // (i.e., POOL_TIERS[6], the last tier)
        const lastTier = POOL_TIERS[POOL_TIERS.length - 1];
        expect(result.poolSize as bigint).toBeGreaterThanOrEqual(
          lastTier.poolSize as bigint,
        );
      }),
      { numRuns: 200 },
    );
  });

  it("determinism: same inputs always produce the same tier", () => {
    fc.assert(
      fc.property(vpArb, vpArb, (current, previous) => {
        const r1 = determinePoolTier(wei(current), wei(previous), POOL_TIERS);
        const r2 = determinePoolTier(wei(current), wei(previous), POOL_TIERS);
        expect(r1).toBe(r2);
      }),
      { numRuns: 200 },
    );
  });
});
