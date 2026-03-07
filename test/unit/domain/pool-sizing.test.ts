import { describe, it, expect } from "vitest";
import { determinePoolTier } from "@/domain/pool-sizing.js";
import { type Wei, wei, ONE_ENS } from "@/domain/types.js";
import { POOL_TIERS } from "@/config.js";

function ens(n: bigint): Wei {
  return wei(n * ONE_ENS);
}

describe("determinePoolTier", () => {
  it("returns lowest tier for 0% growth", () => {
    const tier = determinePoolTier(ens(100n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(5_000n));
    expect(tier.delegateCap).toBe(ens(50n));
    expect(tier.delegatorCap).toBe(ens(250n));
  });

  it("returns lowest tier for 5% growth", () => {
    const tier = determinePoolTier(ens(105n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(5_000n));
  });

  it("returns 10-20% tier at exactly 10% growth", () => {
    const tier = determinePoolTier(ens(110n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(8_000n));
    expect(tier.delegateCap).toBe(ens(80n));
    expect(tier.delegatorCap).toBe(ens(400n));
  });

  it("returns 20-30% tier at 25% growth", () => {
    const tier = determinePoolTier(ens(125n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(10_000n));
  });

  it("returns 30-50% tier at 35% growth", () => {
    const tier = determinePoolTier(ens(135n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(15_000n));
  });

  it("returns 50-75% tier at 60% growth", () => {
    const tier = determinePoolTier(ens(160n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(20_000n));
  });

  it("returns 75-100% tier at 80% growth", () => {
    const tier = determinePoolTier(ens(180n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(25_000n));
  });

  it("returns 100%+ tier at exactly 100% growth", () => {
    const tier = determinePoolTier(ens(200n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(30_000n));
    expect(tier.delegateCap).toBe(ens(300n));
    expect(tier.delegatorCap).toBe(ens(1_500n));
  });

  it("returns 100%+ tier for massive growth", () => {
    const tier = determinePoolTier(ens(1000n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(30_000n));
  });

  it("returns lowest tier for negative growth (decline)", () => {
    const tier = determinePoolTier(ens(80n), ens(100n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(5_000n));
  });

  it("returns 100%+ tier when previous month is zero", () => {
    const tier = determinePoolTier(ens(100n), ens(0n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(30_000n));
  });

  it("returns lowest tier when both are zero", () => {
    const tier = determinePoolTier(ens(0n), ens(0n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(5_000n));
  });

  it("boundary: 9.99% growth stays in 0-10% tier (truncation)", () => {
    // 999/10000 * 10000 = 999 bps < 1000 bps
    const tier = determinePoolTier(wei(10999n), wei(10000n), POOL_TIERS);
    expect(tier.poolSize).toBe(ens(5_000n));
  });
});
