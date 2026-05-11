import { describe, it, expect } from "vitest";
import { applyCapRedistribution } from "../../src/cap-redistribution.js";
import type { Address, Wei, RewardAllocation } from "../../src/types.js";
import { wei } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENS = 10n ** 18n;

function alloc(address: Address, reward: bigint): RewardAllocation {
  return { address, reward: wei(reward) };
}

function totalRewards(allocations: RewardAllocation[]): bigint {
  return allocations.reduce((acc, a) => acc + (a.reward as bigint), 0n);
}

// ---------------------------------------------------------------------------
// No caps needed
// ---------------------------------------------------------------------------
describe("applyCapRedistribution", () => {
  it("returns allocations unchanged when no one exceeds the cap", () => {
    const allocations = [
      alloc("0xaaaa", 100n * ENS),
      alloc("0xbbbb", 200n * ENS),
      alloc("0xcccc", 300n * ENS),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(100n * ENS)],
      ["0xbbbb", wei(200n * ENS)],
      ["0xcccc", wei(300n * ENS)],
    ]);
    const cap = wei(500n * ENS);
    const totalPool = wei(600n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(result).toHaveLength(3);
    // Sum should exactly equal totalPool.
    expect(totalRewards(result)).toBe(600n * ENS);
    // Values should be unchanged (no redistribution happened).
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(100n * ENS);
    expect(byAddr.get("0xbbbb")).toBe(200n * ENS);
    expect(byAddr.get("0xcccc")).toBe(300n * ENS);
  });

  // ---------------------------------------------------------------------------
  // One entry capped
  // ---------------------------------------------------------------------------
  it("caps one entry and redistributes excess to others", () => {
    // Three participants: 100, 200, 700. Cap = 400. Pool = 1000.
    // 0xcccc (700) exceeds cap -> capped to 400, excess = 300.
    // Redistributed to 0xaaaa (weight 100) and 0xbbbb (weight 200):
    //   0xaaaa gets 300 * 100 / 300 = 100 -> total 200
    //   0xbbbb gets 300 * 200 / 300 = 200 -> total 400 (hits cap in next round? No, 400 = cap, not exceeded)
    const allocations = [
      alloc("0xaaaa", 100n * ENS),
      alloc("0xbbbb", 200n * ENS),
      alloc("0xcccc", 700n * ENS),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(100n * ENS)],
      ["0xbbbb", wei(200n * ENS)],
      ["0xcccc", wei(700n * ENS)],
    ]);
    const cap = wei(400n * ENS);
    const totalPool = wei(1000n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(1000n * ENS);
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xcccc")).toBe(400n * ENS);
    expect(byAddr.get("0xaaaa")).toBe(200n * ENS);
    expect(byAddr.get("0xbbbb")).toBe(400n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Multiple rounds of redistribution
  // ---------------------------------------------------------------------------
  it("handles multiple rounds when redistribution causes new caps", () => {
    // Four participants: weights 10, 20, 30, 940.
    // Pool = 1000, cap = 350.
    // Round 1: 0xdddd (940) exceeds cap -> capped to 350, excess = 590.
    //   Redistribute to a/b/c by weight (10+20+30=60):
    //   a: 10 + 590*10/60 = 10 + 98 = 108
    //   b: 20 + 590*20/60 = 20 + 196 = 216
    //   c: 30 + 590*30/60 = 30 + 295 = 325
    // Round 2: no one exceeds 350, done.
    const allocations = [
      alloc("0xaaaa", 10n * ENS),
      alloc("0xbbbb", 20n * ENS),
      alloc("0xcccc", 30n * ENS),
      alloc("0xdddd", 940n * ENS),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(10n * ENS)],
      ["0xbbbb", wei(20n * ENS)],
      ["0xcccc", wei(30n * ENS)],
      ["0xdddd", wei(940n * ENS)],
    ]);
    const cap = wei(350n * ENS);
    const totalPool = wei(1000n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(1000n * ENS);
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xdddd")).toBe(350n * ENS);
    // All uncapped entries should be below or at cap.
    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(cap as bigint);
    }
  });

  it("handles cascading caps across multiple rounds", () => {
    // Three participants: 300, 300, 400. Cap = 350. Pool = 1000.
    // Round 1: 0xcccc (400) capped to 350, excess = 50.
    //   Redistribute to a,b by weight (300+300=600):
    //   a: 300 + 50*300/600 = 300 + 25 = 325
    //   b: 300 + 50*300/600 = 300 + 25 = 325
    // Round 2: no one exceeds 350, done.
    const allocations = [
      alloc("0xaaaa", 300n * ENS),
      alloc("0xbbbb", 300n * ENS),
      alloc("0xcccc", 400n * ENS),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(300n * ENS)],
      ["0xbbbb", wei(300n * ENS)],
      ["0xcccc", wei(400n * ENS)],
    ]);
    const cap = wei(350n * ENS);
    const totalPool = wei(1000n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(1000n * ENS);
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xcccc")).toBe(350n * ENS);
    expect(byAddr.get("0xaaaa")).toBe(325n * ENS);
    expect(byAddr.get("0xbbbb")).toBe(325n * ENS);
  });

  // ---------------------------------------------------------------------------
  // All entries capped
  // ---------------------------------------------------------------------------
  it("caps all entries when everyone exceeds the cap", () => {
    // Two participants: 600, 400. Cap = 300. Pool = 1000.
    // Round 1: 0xaaaa capped to 300, excess = 300.
    //   Redistribute to 0xbbbb: 400 + 300 = 700 (exceeds cap).
    // Round 2: 0xbbbb capped to 300, excess = 400.
    //   No uncapped entries remain.
    // Dust = 1000 - 600 = 400, left unallocated because every recipient is capped.
    const allocations = [
      alloc("0xaaaa", 600n * ENS),
      alloc("0xbbbb", 400n * ENS),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(600n * ENS)],
      ["0xbbbb", wei(400n * ENS)],
    ]);
    const cap = wei(300n * ENS);
    const totalPool = wei(1000n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    // Both are capped at 300, dust of 400 is unallocated.
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(300n * ENS);
    expect(byAddr.get("0xbbbb")).toBe(300n * ENS);
    expect(totalRewards(result)).toBe(600n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Dust assignment
  // ---------------------------------------------------------------------------
  it("assigns dust to the largest uncapped allocation", () => {
    // Use values that create rounding dust.
    // Pool = 100, cap = 40. Three entries with weights 1, 1, 3.
    // Raw proportional: 20, 20, 60.
    // Round 1: 0xcccc capped to 40, excess = 20.
    //   Redistribute to a,b by weight (1+1=2): each gets +10.
    //   a: 30, b: 30.
    // Sum = 30+30+40 = 100. No dust in this case.
    //
    // Now use odd numbers for dust: pool = 100, weights 1,1,1, cap = 40.
    // Raw: 33, 33, 33 (sum = 99, dust = 1 from initial proportional).
    // No one exceeds cap. Dust = 1 goes to largest (tie: lowest addr).
    const allocations = [
      alloc("0xaaaa", 33n),
      alloc("0xbbbb", 33n),
      alloc("0xcccc", 33n),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(1n)],
      ["0xbbbb", wei(1n)],
      ["0xcccc", wei(1n)],
    ]);
    const cap = wei(40n);
    const totalPool = wei(100n);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(100n);
    // Dust of 1 goes to largest uncapped; all are equal (33), so lowest address wins.
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(34n);
    expect(byAddr.get("0xbbbb")).toBe(33n);
    expect(byAddr.get("0xcccc")).toBe(33n);
  });

  // ---------------------------------------------------------------------------
  // Tie-breaking by address
  // ---------------------------------------------------------------------------
  it("breaks ties by lowest address (lexicographic)", () => {
    // Two equal-weight, equal-reward entries. Dust goes to lower address.
    const allocations = [
      alloc("0xbbbb", 49n),
      alloc("0xaaaa", 49n),
    ];
    const weights = new Map<Address, Wei>([
      ["0xbbbb", wei(1n)],
      ["0xaaaa", wei(1n)],
    ]);
    const cap = wei(100n);
    const totalPool = wei(100n);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(100n);
    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    // Dust of 2 goes to 0xaaaa (lower address, tied for largest).
    expect(byAddr.get("0xaaaa")).toBe(51n);
    expect(byAddr.get("0xbbbb")).toBe(49n);
  });

  // ---------------------------------------------------------------------------
  // Empty input
  // ---------------------------------------------------------------------------
  it("returns empty array for empty input", () => {
    const result = applyCapRedistribution([], new Map(), wei(100n), wei(0n));
    expect(result).toEqual([]);
  });

  // ---------------------------------------------------------------------------
  // Output is sorted by address
  // ---------------------------------------------------------------------------
  it("returns results sorted by address", () => {
    const allocations = [
      alloc("0xcccc", 30n),
      alloc("0xaaaa", 10n),
      alloc("0xbbbb", 20n),
    ];
    const weights = new Map<Address, Wei>([
      ["0xcccc", wei(3n)],
      ["0xaaaa", wei(1n)],
      ["0xbbbb", wei(2n)],
    ]);
    const cap = wei(100n);
    const totalPool = wei(60n);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(result.map((r) => r.address)).toEqual([
      "0xaaaa",
      "0xbbbb",
      "0xcccc",
    ]);
  });

  // ---------------------------------------------------------------------------
  // Single entry gets entire pool
  // ---------------------------------------------------------------------------
  it("single entry is capped and leaves the remainder unallocated", () => {
    const allocations = [alloc("0xaaaa", 1000n * ENS)];
    const weights = new Map<Address, Wei>([["0xaaaa", wei(1000n * ENS)]]);
    const cap = wei(500n * ENS);
    const totalPool = wei(1000n * ENS);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    expect(totalRewards(result)).toBe(500n * ENS);
    expect(result[0].reward).toBe(500n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Invariant: sum of rewards <= totalPool
  // ---------------------------------------------------------------------------
  it("never exceeds totalPool or the per-recipient cap with many participants and rounding", () => {
    // 7 entries with varying weights, poolSize = 10_000_000 (odd), cap = 2_000_000.
    const addresses: Address[] = [
      "0x1111",
      "0x2222",
      "0x3333",
      "0x4444",
      "0x5555",
      "0x6666",
      "0x7777",
    ];
    const weightValues = [7n, 13n, 19n, 23n, 29n, 31n, 37n];
    const totalWeight = weightValues.reduce((a, b) => a + b, 0n); // 159

    const pool = 10_000_007n; // prime, maximizes rounding dust
    const capVal = wei(2_000_000n);

    const allocations = addresses.map((addr, i) =>
      alloc(addr, (pool * weightValues[i]) / totalWeight),
    );
    const weights = new Map<Address, Wei>(
      addresses.map((addr, i) => [addr, wei(weightValues[i])]),
    );

    const result = applyCapRedistribution(
      allocations,
      weights,
      capVal,
      wei(pool),
    );

    expect(totalRewards(result)).toBeLessThanOrEqual(pool);
    for (const r of result) {
      expect(r.reward as bigint).toBeLessThanOrEqual(capVal as bigint);
    }
  });

  it("never assigns dust to zero-weight recipients", () => {
    const allocations = [
      alloc("0xaaaa", 1000n),
      alloc("0xbbbb", 0n),
    ];
    const weights = new Map<Address, Wei>([
      ["0xaaaa", wei(1000n)],
      ["0xbbbb", wei(0n)],
    ]);
    const cap = wei(200n);
    const totalPool = wei(1000n);

    const result = applyCapRedistribution(allocations, weights, cap, totalPool);

    const byAddr = new Map(result.map((r) => [r.address, r.reward]));
    expect(byAddr.get("0xaaaa")).toBe(200n);
    expect(byAddr.get("0xbbbb")).toBe(0n);
    expect(totalRewards(result)).toBe(200n);
  });
});
