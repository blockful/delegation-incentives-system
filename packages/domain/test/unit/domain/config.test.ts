import { describe, it, expect } from "vitest";
import {
  POOL_TIERS,
  DELEGATE_POOL_BPS,
  DELEGATOR_POOL_BPS,
  MIN_PAYOUT_THRESHOLD,
  LOTTERY_TARGET_POOL_SIZE,
} from "@/config.js";

describe("POOL_TIERS configuration", () => {
  it("has at least one tier", () => {
    expect(POOL_TIERS.length).toBeGreaterThan(0);
  });

  it("first tier starts at 0 bps", () => {
    expect(POOL_TIERS[0].momGrowthMinBps).toBe(0n);
  });

  it("tiers are contiguous (no gaps in bps ranges)", () => {
    for (let i = 1; i < POOL_TIERS.length; i++) {
      expect(POOL_TIERS[i].momGrowthMinBps).toBe(
        POOL_TIERS[i - 1].momGrowthMaxBps,
      );
    }
  });

  it("all tiers have positive poolSize, delegateCap, delegatorCap", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.poolSize > 0n).toBe(true);
      expect(tier.delegateCap > 0n).toBe(true);
      expect(tier.delegatorCap > 0n).toBe(true);
    }
  });

  it("delegateCap < delegatorCap in every tier (delegates get smaller individual cap)", () => {
    for (const tier of POOL_TIERS) {
      expect(tier.delegateCap < tier.delegatorCap).toBe(true);
    }
  });

  it("pool sizes are non-decreasing across tiers", () => {
    for (let i = 1; i < POOL_TIERS.length; i++) {
      expect(POOL_TIERS[i].poolSize >= POOL_TIERS[i - 1].poolSize).toBe(true);
    }
  });

  it("last tier has a large upper bound (effectively infinite)", () => {
    const lastTier = POOL_TIERS[POOL_TIERS.length - 1];
    // Upper bound should be at least 1,000,000 bps (10,000%)
    expect(lastTier.momGrowthMaxBps >= 1_000_000n).toBe(true);
  });
});

describe("Pool split constants", () => {
  it("delegate + delegator pool bps sum to 10000 (100%)", () => {
    expect(DELEGATE_POOL_BPS + DELEGATOR_POOL_BPS).toBe(10000n);
  });

  it("delegate pool is 10% (1000 bps)", () => {
    expect(DELEGATE_POOL_BPS).toBe(1000n);
  });

  it("delegator pool is 90% (9000 bps)", () => {
    expect(DELEGATOR_POOL_BPS).toBe(9000n);
  });
});

describe("Lottery constants", () => {
  it("min payout threshold is positive", () => {
    expect(MIN_PAYOUT_THRESHOLD > 0n).toBe(true);
  });

  it("target pool size is positive and > min threshold", () => {
    expect(LOTTERY_TARGET_POOL_SIZE > 0n).toBe(true);
    expect(LOTTERY_TARGET_POOL_SIZE > MIN_PAYOUT_THRESHOLD).toBe(true);
  });
});
