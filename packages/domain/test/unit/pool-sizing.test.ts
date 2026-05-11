import { describe, it, expect } from "vitest";
import { computeVpGrowthPct, selectPoolTier } from "../../src/pool-sizing.js";
import { wei } from "../../src/types.js";
import { POOL_TIERS } from "../../src/config.js";

const ENS = 10n ** 18n;

// ---------------------------------------------------------------------------
// computeVpGrowthPct
// ---------------------------------------------------------------------------
describe("computeVpGrowthPct", () => {
  it("returns 0 when vpStart is 0", () => {
    expect(computeVpGrowthPct(wei(0n), wei(1000n * ENS))).toBe(0);
  });

  it("computes 50% growth", () => {
    const start = wei(100n * ENS);
    const end = wei(150n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(50);
  });

  it("computes 100% growth (doubling)", () => {
    const start = wei(100n * ENS);
    const end = wei(200n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(100);
  });

  it("computes 0% growth (no change)", () => {
    const start = wei(500n * ENS);
    const end = wei(500n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(0);
  });

  it("computes negative growth", () => {
    const start = wei(200n * ENS);
    const end = wei(100n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(-50);
  });

  it("handles fractional percentages (15.5%)", () => {
    // 1000 → 1155 = 15.5% growth
    const start = wei(1000n * ENS);
    const end = wei(1155n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(15.5);
  });

  it("handles very small growth", () => {
    // 10000 → 10001 = 0.01%
    const start = wei(10000n * ENS);
    const end = wei(10001n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(0.01);
  });

  it("handles large growth (300%)", () => {
    const start = wei(100n * ENS);
    const end = wei(400n * ENS);
    expect(computeVpGrowthPct(start, end)).toBe(300);
  });
});

// ---------------------------------------------------------------------------
// selectPoolTier
// ---------------------------------------------------------------------------
describe("selectPoolTier", () => {
  it("negative growth maps to first tier (0-10%)", () => {
    const tier = selectPoolTier(-25);
    expect(tier.minGrowthPct).toBe(0);
    expect(tier.maxGrowthPct).toBe(10);
    expect(tier.poolSize).toBe(wei(5_000n * ENS));
  });

  it("0% growth falls in first tier (0-10%)", () => {
    const tier = selectPoolTier(0);
    expect(tier.minGrowthPct).toBe(0);
    expect(tier.maxGrowthPct).toBe(10);
    expect(tier.poolSize).toBe(wei(5_000n * ENS));
  });

  it("exact 10% boundary falls in second tier (10-20%)", () => {
    const tier = selectPoolTier(10);
    expect(tier.minGrowthPct).toBe(10);
    expect(tier.maxGrowthPct).toBe(20);
    expect(tier.poolSize).toBe(wei(8_000n * ENS));
  });

  it("exact 20% boundary falls in third tier (20-30%)", () => {
    const tier = selectPoolTier(20);
    expect(tier.minGrowthPct).toBe(20);
    expect(tier.maxGrowthPct).toBe(30);
    expect(tier.poolSize).toBe(wei(10_000n * ENS));
  });

  it("exact 30% boundary falls in fourth tier (30-50%)", () => {
    const tier = selectPoolTier(30);
    expect(tier.minGrowthPct).toBe(30);
    expect(tier.maxGrowthPct).toBe(50);
    expect(tier.poolSize).toBe(wei(15_000n * ENS));
  });

  it("exact 50% boundary falls in fifth tier (50-75%)", () => {
    const tier = selectPoolTier(50);
    expect(tier.minGrowthPct).toBe(50);
    expect(tier.maxGrowthPct).toBe(75);
    expect(tier.poolSize).toBe(wei(20_000n * ENS));
  });

  it("exact 75% boundary falls in sixth tier (75-100%)", () => {
    const tier = selectPoolTier(75);
    expect(tier.minGrowthPct).toBe(75);
    expect(tier.maxGrowthPct).toBe(100);
    expect(tier.poolSize).toBe(wei(25_000n * ENS));
  });

  it("exact 100% boundary falls in last tier (100+)", () => {
    const tier = selectPoolTier(100);
    expect(tier.minGrowthPct).toBe(100);
    expect(tier.maxGrowthPct).toBe(Infinity);
    expect(tier.poolSize).toBe(wei(30_000n * ENS));
  });

  it("150% growth falls in last tier (100+)", () => {
    const tier = selectPoolTier(150);
    expect(tier.minGrowthPct).toBe(100);
    expect(tier.maxGrowthPct).toBe(Infinity);
    expect(tier.poolSize).toBe(wei(30_000n * ENS));
  });

  it("9.99% falls in first tier", () => {
    const tier = selectPoolTier(9.99);
    expect(tier.minGrowthPct).toBe(0);
    expect(tier.maxGrowthPct).toBe(10);
  });

  it("delegate cap is 1% of pool size", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.delegateCap).toBe(wei(tier.poolSize / 100n));
    }
  });

  it("delegator cap is 5% of pool size", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.delegatorCap).toBe(wei((tier.poolSize * 5n) / 100n));
    }
  });

  it("vpStart = 0 yields 0% growth which maps to first tier", () => {
    const pct = computeVpGrowthPct(wei(0n), wei(1000n * ENS));
    const tier = selectPoolTier(pct);
    expect(pct).toBe(0);
    expect(tier.minGrowthPct).toBe(0);
    expect(tier.maxGrowthPct).toBe(10);
  });
});
