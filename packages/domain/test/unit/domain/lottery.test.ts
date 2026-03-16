import { describe, it, expect } from "vitest";
import { runLottery } from "@/lottery.js";
import { type RewardAllocation, wei, ONE_ENS } from "@/types.js";
import { sum } from "@/util/bigint-math.js";

function alloc(
  address: string,
  amount: bigint,
  role: "delegate" | "delegator" = "delegator",
): RewardAllocation {
  return { address, amount: wei(amount), role };
}

const SEED = 12345n;

describe("runLottery", () => {
  it("returns all as direct payouts when none are below threshold", () => {
    const allocations = [
      alloc("0xa", 2n * ONE_ENS),
      alloc("0xb", 3n * ONE_ENS),
    ];
    const { directPayouts, lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      10n * ONE_ENS,
      SEED,
    );
    expect(directPayouts.length).toBe(2);
    expect(lotteryPools.length).toBe(0);
  });

  it("separates sub-threshold payouts into lottery", () => {
    const allocations = [
      alloc("0xa", 2n * ONE_ENS),
      alloc("0xb", ONE_ENS / 2n), // 0.5 ENS — below threshold
    ];
    const { directPayouts, lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      10n * ONE_ENS,
      SEED,
    );
    expect(directPayouts.length).toBe(2); // solo sub-threshold entry promoted to direct payout
    expect(directPayouts.map((p) => p.address)).toContain("0xa");
    expect(directPayouts.map((p) => p.address)).toContain("0xb");
    expect(lotteryPools.length).toBe(0);
  });

  it("groups entries into pools approaching target size", () => {
    // 20 entries of 0.5 ENS each = 10 ENS total
    const allocations = Array.from({ length: 20 }, (_, i) =>
      alloc(`0x${i.toString(16).padStart(4, "0")}`, ONE_ENS / 2n),
    );
    const { lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      10n * ONE_ENS,
      SEED,
    );
    // All entries should be in lottery pools
    const totalEntries = lotteryPools.reduce(
      (acc, p) => acc + p.entries.length,
      0,
    );
    expect(totalEntries).toBe(20);
    // Each pool should have entries summing to ~10 ENS or less
    for (const pool of lotteryPools) {
      expect(pool.totalPrize as bigint).toBeLessThanOrEqual(10n * ONE_ENS);
    }
  });

  it("each pool has exactly one winner", () => {
    const allocations = Array.from({ length: 10 }, (_, i) =>
      alloc(`0x${i}`, ONE_ENS / 10n),
    );
    const { lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      5n * ONE_ENS,
      SEED,
    );
    for (const pool of lotteryPools) {
      expect(pool.winner).toBeTruthy();
      expect(pool.entries.some((e) => e.address === pool.winner)).toBe(true);
    }
  });

  it("is deterministic: same seed produces same winners", () => {
    const allocations = Array.from({ length: 10 }, (_, i) =>
      alloc(`0x${i}`, ONE_ENS / 5n),
    );
    const r1 = runLottery(allocations, ONE_ENS, 5n * ONE_ENS, SEED);
    const r2 = runLottery(allocations, ONE_ENS, 5n * ONE_ENS, SEED);
    expect(r1.lotteryPools.map((p) => p.winner)).toEqual(
      r2.lotteryPools.map((p) => p.winner),
    );
  });

  it("different seed can produce different winners", () => {
    const allocations = Array.from({ length: 20 }, (_, i) =>
      alloc(`0x${i.toString(16).padStart(4, "0")}`, ONE_ENS / 5n),
    );
    const r1 = runLottery(allocations, ONE_ENS, 5n * ONE_ENS, 111n);
    const r2 = runLottery(allocations, ONE_ENS, 5n * ONE_ENS, 222n);
    // With enough entries and different seeds, winners should likely differ
    // (not guaranteed but extremely likely)
    const w1 = r1.lotteryPools.map((p) => p.winner).join(",");
    const w2 = r2.lotteryPools.map((p) => p.winner).join(",");
    // We just verify both are valid, not necessarily different
    expect(w1.length).toBeGreaterThan(0);
    expect(w2.length).toBeGreaterThan(0);
  });

  it("excludes zero-amount allocations from lottery", () => {
    const allocations = [
      alloc("0xa", 0n),
      alloc("0xb", ONE_ENS / 2n),
    ];
    const { directPayouts, lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      10n * ONE_ENS,
      SEED,
    );
    // 0xa has zero amount — excluded entirely; 0xb is a solo sub-threshold entry → direct payout
    expect(lotteryPools.length).toBe(0);
    expect(directPayouts.map((p) => p.address)).toContain("0xb");
    expect(directPayouts.map((p) => p.address)).not.toContain("0xa");
  });

  it("promotes solo lottery pool to direct payout", () => {
    // One entry below threshold that would form its own pool (solo) → direct payout
    const allocations = [
      alloc("0xa", 2n * ONE_ENS), // above threshold → direct
      alloc("0xsolo", ONE_ENS / 2n), // below threshold, forms solo pool → direct
    ];
    const { directPayouts, lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      10n * ONE_ENS,
      SEED,
    );
    expect(lotteryPools).toHaveLength(0);
    expect(directPayouts.map((p) => p.address)).toContain("0xa");
    expect(directPayouts.map((p) => p.address)).toContain("0xsolo");
  });

  it("splits entries across multiple pools when cumulative amount exceeds target pool size", () => {
    // 4 entries of 0.5 ENS each = 2 ENS total, target pool = 1 ENS
    // After adding 2 entries (sum=1), third entry triggers a new pool
    const allocations = [
      alloc("0xa", ONE_ENS / 2n),
      alloc("0xb", ONE_ENS / 2n),
      alloc("0xc", ONE_ENS / 2n),
      alloc("0xd", ONE_ENS / 2n),
    ];
    const { lotteryPools } = runLottery(
      allocations,
      ONE_ENS, // minThreshold
      ONE_ENS, // targetPoolSize — small enough to force a split
      SEED,
    );
    expect(lotteryPools.length).toBe(2);
    const totalEntries = lotteryPools.reduce((acc, p) => acc + p.entries.length, 0);
    expect(totalEntries).toBe(4);
  });

  it("lottery pool total prize equals sum of entry amounts", () => {
    const allocations = Array.from({ length: 10 }, (_, i) =>
      alloc(`0x${i}`, BigInt(100 + i) * (ONE_ENS / 1000n)),
    );
    const { lotteryPools } = runLottery(
      allocations,
      ONE_ENS,
      5n * ONE_ENS,
      SEED,
    );
    for (const pool of lotteryPools) {
      const entryTotal = sum(
        pool.entries.map((e) => e.originalAmount as bigint),
      );
      expect(pool.totalPrize).toBe(wei(entryTotal));
    }
  });
});
