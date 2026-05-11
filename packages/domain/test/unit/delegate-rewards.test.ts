import { describe, it, expect } from "vitest";
import { computeDelegateRewards } from "../../src/delegate-rewards.js";
import type { Address, Wei } from "../../src/types.js";
import { wei } from "../../src/types.js";
import { applyBps } from "../../src/util/bigint-math.js";
import { DELEGATE_POOL_BPS, DELEGATE_CAP_BPS } from "../../src/config.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENS = 10n ** 18n;

function totalRewards(allocations: { reward: Wei }[]): bigint {
  return allocations.reduce((acc, a) => acc + (a.reward as bigint), 0n);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("computeDelegateRewards", () => {
  it("returns empty array for empty input", () => {
    const result = computeDelegateRewards(new Map(), wei(1000n * ENS));
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Proportional allocation without caps
  // ---------------------------------------------------------------------------
  it("allocates proportionally when no delegate exceeds the cap", () => {
    // Pool = 1_000_000 ENS -> delegatePool = 100_000, delegateCap = 10_000 ENS.
    // Two delegates with weights 1:3. Total = 4 parts.
    // Raw: A = 25_000, B = 75_000. Both exceed 10_000 cap.
    // Need enough delegates so each share < cap.
    // With 15 equal delegates: each gets 100_000/15 ~= 6_666 ENS < 10_000 cap.
    const poolSize = wei(1_500_000n * ENS);
    const delegatePool = applyBps(poolSize, DELEGATE_POOL_BPS); // 150_000 ENS
    const delegateCap = applyBps(poolSize, DELEGATE_CAP_BPS); // 15_000 ENS

    // 15 delegates with weights 1..15, total weight = 120.
    // Largest share = 15/120 * 150_000 = 18_750 > 15_000 cap. Still too big.
    // Use 15 equal delegates: each gets 150_000/15 = 10_000 exactly = cap. That's on the edge.
    // Use 20 equal delegates: each gets 150_000/20 = 7_500 < 15_000 cap.
    const twaps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twaps.set(addr, wei(100n * ENS));
    }

    const result = computeDelegateRewards(twaps, poolSize);

    expect(result).toHaveLength(20);
    expect(totalRewards(result)).toBe(delegatePool);

    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(delegateCap as bigint);
      expect(r.reward).toBe(7_500n * ENS);
    }
  });

  it("allocates proportionally with many small delegates", () => {
    // Pool = 1_000_000 ENS, delegatePool = 100_000, delegateCap = 10_000 ENS.
    // 20 delegates with equal weight -> each gets 5_000 ENS (below 10_000 cap).
    const poolSize = wei(1_000_000n * ENS);
    const delegatePool = applyBps(poolSize, DELEGATE_POOL_BPS); // 100_000 ENS
    const delegateCap = applyBps(poolSize, DELEGATE_CAP_BPS); // 10_000 ENS

    expect(delegatePool).toBe(100_000n * ENS);
    expect(delegateCap).toBe(10_000n * ENS);

    const twaps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twaps.set(addr, wei(100n * ENS));
    }

    const result = computeDelegateRewards(twaps, poolSize);

    expect(result).toHaveLength(20);
    expect(totalRewards(result)).toBe(delegatePool);

    for (const r of result) {
      // Each gets 100_000 / 20 = 5_000 ENS, well below 10_000 cap.
      expect(r.reward as bigint).toBeLessThanOrEqual(delegateCap as bigint);
      expect(r.reward).toBe(5_000n * ENS);
    }
  });

  // ---------------------------------------------------------------------------
  // Cap enforcement
  // ---------------------------------------------------------------------------
  it("enforces per-delegate cap and redistributes excess", () => {
    // Pool = 1_000_000 ENS -> delegatePool = 100_000, cap = 10_000 ENS.
    // One delegate has 90% of TWAP, the other 10%.
    // Without cap: A gets 90_000, B gets 10_000.
    // A is capped at 10_000. Excess = 80_000 redistributed to B.
    // B: 10_000 + 80_000 = 90_000 (exceeds cap again).
    // B capped at 10_000. The remaining 80_000 stays unallocated.
    const poolSize = wei(1_000_000n * ENS);
    const delegateCap = applyBps(poolSize, DELEGATE_CAP_BPS); // 10_000 ENS

    const twaps = new Map<Address, Wei>([
      ["0xaaaa", wei(9_000n * ENS)], // 90%
      ["0xbbbb", wei(1_000n * ENS)], // 10%
    ]);

    const result = computeDelegateRewards(twaps, poolSize);

    expect(result).toHaveLength(2);
    expect(totalRewards(result)).toBe(20_000n * ENS);

    // Both are capped at 10_000.
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(delegateCap);
    expect(byAddr.get("0xbbbb")).toBe(delegateCap);
  });

  it("caps redistribute correctly with uneven weights", () => {
    // Pool = 1_000_000 ENS -> delegatePool = 100_000, cap = 10_000.
    // 5 delegates: 4 small (weight 1k each), 1 large (weight 96k).
    // Raw: small each gets ~1_000, large gets ~96_000.
    // Large capped to 10_000, excess = 86_000 redistributed to smalls.
    // Each small: 1_000 + 86_000*(1k/4k) = 1_000 + 21_500 = 22_500 (exceeds cap).
    const poolSize = wei(1_000_000n * ENS);
    const delegatePool = applyBps(poolSize, DELEGATE_POOL_BPS);
    const delegateCap = applyBps(poolSize, DELEGATE_CAP_BPS);

    const twaps = new Map<Address, Wei>([
      ["0xaaaa", wei(1_000n * ENS)],
      ["0xbbbb", wei(1_000n * ENS)],
      ["0xcccc", wei(1_000n * ENS)],
      ["0xdddd", wei(1_000n * ENS)],
      ["0xeeee", wei(96_000n * ENS)],
    ]);

    const result = computeDelegateRewards(twaps, poolSize);

    expect(totalRewards(result)).toBeLessThanOrEqual(delegatePool);
    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(delegateCap as bigint);
    }
  });

  // ---------------------------------------------------------------------------
  // Single delegate is capped
  // ---------------------------------------------------------------------------
  it("single delegate is capped and leaves the remainder unallocated", () => {
    const poolSize = wei(1_000_000n * ENS);
    const delegatePool = applyBps(poolSize, DELEGATE_POOL_BPS); // 100_000 ENS
    const delegateCap = applyBps(poolSize, DELEGATE_CAP_BPS); // 10_000 ENS

    const twaps = new Map<Address, Wei>([
      ["0xaaaa", wei(1_000_000n * ENS)],
    ]);

    const result = computeDelegateRewards(twaps, poolSize);

    expect(result).toHaveLength(1);
    expect(result[0].reward).toBe(delegateCap);
    expect(totalRewards(result)).toBe(delegateCap);
    expect(totalRewards(result)).toBeLessThan(delegatePool as bigint);
  });

  // ---------------------------------------------------------------------------
  // Pool size invariant
  // ---------------------------------------------------------------------------
  it("sum of rewards equals delegate pool exactly", () => {
    // Use prime numbers to maximize rounding issues.
    const poolSize = wei(999_997n * ENS);
    const delegatePool = applyBps(poolSize, DELEGATE_POOL_BPS);

    const twaps = new Map<Address, Wei>();
    for (let i = 0; i < 20; i++) {
      const addr = `0x${i.toString(16).padStart(4, "0")}` as Address;
      twaps.set(addr, wei(100n * ENS));
    }

    const result = computeDelegateRewards(twaps, poolSize);
    expect(totalRewards(result)).toBe(delegatePool);
  });

  // ---------------------------------------------------------------------------
  // Output is sorted by address
  // ---------------------------------------------------------------------------
  it("returns results sorted by address", () => {
    const poolSize = wei(1_000_000n * ENS);
    const twaps = new Map<Address, Wei>([
      ["0xcccc", wei(100n * ENS)],
      ["0xaaaa", wei(200n * ENS)],
      ["0xbbbb", wei(300n * ENS)],
    ]);

    const result = computeDelegateRewards(twaps, poolSize);
    expect(result.map((r) => r.address)).toEqual([
      "0xaaaa",
      "0xbbbb",
      "0xcccc",
    ]);
  });
});
