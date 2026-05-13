import { describe, it, expect } from "vitest";
import { wei } from "../../src/types.js";
import { POOL_TIERS } from "../../src/config.js";
import { estimateAprPct, computeTierAprPct } from "../../src/apr.js";

const ENS = 10n ** 18n;

// ---------------------------------------------------------------------------
// estimateAprPct(monthlyReward, share)
// Annualizes a monthly reward as a simple percentage of the user's share.
// APR (not APY): no compounding — monthly * 12 * 100 / share, rounded down
// to two decimal places via integer math.
// ---------------------------------------------------------------------------
describe("estimateAprPct", () => {
  it("returns 0.00 when share is 0", () => {
    expect(estimateAprPct(wei(1n * ENS), wei(0n))).toBe("0.00");
  });

  it("returns 0.00 when monthly reward is 0", () => {
    expect(estimateAprPct(wei(0n), wei(1n * ENS))).toBe("0.00");
  });

  it("returns 0.00 when both are 0", () => {
    expect(estimateAprPct(wei(0n), wei(0n))).toBe("0.00");
  });

  it("annualizes a 1% monthly rate to 12.00% APR", () => {
    // 1 ENS monthly on 100 ENS share = 1% monthly = 12% APR
    expect(estimateAprPct(wei(1n * ENS), wei(100n * ENS))).toBe("12.00");
  });

  it("matches the proposal's tier-0 baseline: 4500 ENS pool / 1.35M VP = 4.00%", () => {
    const pool = wei(4500n * ENS);
    const totalVp = wei(1_350_000n * ENS);
    expect(estimateAprPct(pool, totalVp)).toBe("4.00");
  });

  it("rounds (truncates) to two decimal places", () => {
    // 7 ENS / 1000 ENS = 0.7% monthly = 8.40% APR
    expect(estimateAprPct(wei(7n * ENS), wei(1000n * ENS))).toBe("8.40");
  });

  it("formats high APRs without losing precision", () => {
    // monthly equals share → 100% monthly → 1200% APR
    expect(estimateAprPct(wei(1n * ENS), wei(1n * ENS))).toBe("1200.00");
  });
});

// ---------------------------------------------------------------------------
// computeTierAprPct(tier, vpStart)
// Tier-table APR uses the VP that would exist when the tier is reached
// (vpStart × (1 + tier.minGrowthPct/100)) — NOT the current spot VP.
// This makes APR a property of the tier definition, calibrated against
// the round-start baseline.
// ---------------------------------------------------------------------------
describe("computeTierAprPct", () => {
  const VP_BASELINE = wei(1_350_000n * ENS);

  it("matches proposal tier 0 (0–10% growth) → 4.00%", () => {
    // pool 5000 × 0.9 = 4500; denom = baseline × 1.00 = 1.35M
    expect(computeTierAprPct(POOL_TIERS[0], VP_BASELINE)).toBe("4.00");
  });

  it("matches proposal tier 1 (10–20% growth) → ~5.81% (proposal table: ~5.75%)", () => {
    // pool 8000 × 0.9 = 7200; denom = baseline × 1.10 = 1.485M
    // 7200 * 12 / 1_485_000 * 100 = 5.818...% → "5.81"
    expect(computeTierAprPct(POOL_TIERS[1], VP_BASELINE)).toBe("5.81");
  });

  it("matches proposal tier 6 (100%+ growth) → 12.00% (using 2× baseline denom)", () => {
    // pool 30000 × 0.9 = 27000; denom = baseline × 2.00 = 2.7M
    expect(computeTierAprPct(POOL_TIERS[6], VP_BASELINE)).toBe("12.00");
  });

  it("does NOT inflate higher-tier APRs by using the spot vpStart", () => {
    // Each tier's APR should fall in the proposal's documented neighborhood
    // when computed against the same baseline. Before the fix, tier 6
    // would show ~24% (2× the actual) because the denominator stayed at
    // baseline instead of growing with the tier.
    const tier6Apr = parseFloat(computeTierAprPct(POOL_TIERS[6], VP_BASELINE));
    expect(tier6Apr).toBeLessThan(13);
    expect(tier6Apr).toBeGreaterThan(11);
  });

  it("returns 0.00 when vpStart is 0", () => {
    expect(computeTierAprPct(POOL_TIERS[0], wei(0n))).toBe("0.00");
  });

  it("scales inversely with vpStart for a fixed tier", () => {
    const half = wei(675_000n * ENS);
    const full = wei(1_350_000n * ENS);
    const aprHalf = parseFloat(computeTierAprPct(POOL_TIERS[0], half));
    const aprFull = parseFloat(computeTierAprPct(POOL_TIERS[0], full));
    expect(aprHalf).toBeCloseTo(aprFull * 2, 2);
  });
});
