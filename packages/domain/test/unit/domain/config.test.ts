import { describe, it, expect } from "vitest";
import {
  POOL_TIERS,
  DELEGATE_POOL_BPS,
  DELEGATOR_POOL_BPS,
  MIN_PAYOUT_THRESHOLD,
  LOTTERY_TARGET_POOL_SIZE,
} from "@/config.js";
import { ONE_ENS } from "@/types.js";

describe("config invariants", () => {
  it("pool split sums to 100%", () => {
    expect(DELEGATE_POOL_BPS + DELEGATOR_POOL_BPS).toBe(10000n);
  });

  it("tier boundaries are contiguous (no gaps)", () => {
    for (let i = 0; i < POOL_TIERS.length - 1; i++) {
      expect(POOL_TIERS[i].momGrowthMaxBps).toBe(
        POOL_TIERS[i + 1].momGrowthMinBps,
      );
    }
  });

  it("first tier starts at zero", () => {
    expect(POOL_TIERS[0].momGrowthMinBps).toBe(0n);
  });

  it("pool sizes are monotonically increasing", () => {
    for (let i = 1; i < POOL_TIERS.length; i++) {
      expect(POOL_TIERS[i].poolSize).toBeGreaterThanOrEqual(
        POOL_TIERS[i - 1].poolSize,
      );
    }
  });

  it("delegate caps are monotonically increasing", () => {
    for (let i = 1; i < POOL_TIERS.length; i++) {
      expect(POOL_TIERS[i].delegateCap).toBeGreaterThanOrEqual(
        POOL_TIERS[i - 1].delegateCap,
      );
    }
  });

  it("delegator caps are monotonically increasing", () => {
    for (let i = 1; i < POOL_TIERS.length; i++) {
      expect(POOL_TIERS[i].delegatorCap).toBeGreaterThanOrEqual(
        POOL_TIERS[i - 1].delegatorCap,
      );
    }
  });

  it("delegate cap is 1% of pool size for every tier", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.delegateCap * 100n).toBe(tier.poolSize);
    }
  });

  it("delegator cap is 5% of pool size for every tier", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.delegatorCap * 20n).toBe(tier.poolSize);
    }
  });

  it("MIN_PAYOUT_THRESHOLD is less than smallest delegator cap", () => {
    const smallestDelegatorCap = POOL_TIERS.reduce(
      (min, tier) =>
        (tier.delegatorCap as bigint) < (min as bigint) ? tier.delegatorCap : min,
      POOL_TIERS[0].delegatorCap,
    );
    expect(MIN_PAYOUT_THRESHOLD).toBeLessThan(smallestDelegatorCap);
  });

  it("at least 2 tiers exist", () => {
    expect(POOL_TIERS.length).toBeGreaterThanOrEqual(2);
  });
});
