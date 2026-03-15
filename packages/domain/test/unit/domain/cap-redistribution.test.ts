import { describe, it, expect } from "vitest";
import { allocateWithCap } from "@/cap-redistribution.js";
import { type AllocationInput, wei } from "@/types.js";
import { sum } from "@/util/bigint-math.js";

function input(id: string, weight: bigint): AllocationInput {
  return { id, weight: wei(weight) };
}

describe("allocateWithCap", () => {
  it("returns empty array for empty input", () => {
    const result = allocateWithCap([], 1000n, 500n);
    expect(result).toEqual([]);
  });

  it("handles zero total weight", () => {
    const result = allocateWithCap(
      [input("a", 0n), input("b", 0n)],
      1000n,
      500n,
    );
    expect(result).toEqual([
      { id: "a", amount: wei(0n) },
      { id: "b", amount: wei(0n) },
    ]);
  });

  it("distributes pro-rata when no one exceeds cap", () => {
    const result = allocateWithCap(
      [input("a", 30n), input("b", 70n)],
      1000n,
      1000n, // cap higher than total pool
    );
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(300n));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(700n));
  });

  it("caps a single recipient and redistributes", () => {
    // a=80, b=20 → raw: a=800, b=200 → cap=500
    // a capped at 500, excess 300 redistributed to b
    // b gets 200 + 300 = 500
    const result = allocateWithCap(
      [input("a", 80n), input("b", 20n)],
      1000n,
      500n,
    );
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(500n));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(500n));
  });

  it("handles cascading cap breaches (redistribution causes new breach)", () => {
    // Three recipients: a=70, b=20, c=10, pool=1000, cap=300
    // Round 1: a=700>300 (capped), remaining=700
    // Round 2: b=(20/30)*700=466>300 (capped), remaining=400
    // Round 3: c gets all 400>300 (capped), remaining=100
    // All capped at 300 each = 900. 100 unallocated (everyone at cap).
    const result = allocateWithCap(
      [input("a", 70n), input("b", 20n), input("c", 10n)],
      1000n,
      300n,
    );
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(300n));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(300n));
    expect(result.find((r) => r.id === "c")!.amount).toBe(wei(300n));
    // When everyone is at cap, excess is unallocated
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(900n);
  });

  it("single recipient gets min(pool, cap)", () => {
    const result1 = allocateWithCap([input("a", 100n)], 1000n, 500n);
    expect(result1[0].amount).toBe(wei(500n));

    const result2 = allocateWithCap([input("a", 100n)], 300n, 500n);
    expect(result2[0].amount).toBe(wei(300n));
  });

  it("preserves total pool via dust assignment", () => {
    // With BigInt truncation, small rounding errors can occur
    const inputs = [
      input("a", 33n),
      input("b", 33n),
      input("c", 34n),
    ];
    const pool = 1000n;
    const result = allocateWithCap(inputs, pool, 500n);
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(pool);
  });

  it("assigns dust to largest allocation with alphabetical tie-breaking", () => {
    const inputs = [
      input("b", 50n),
      input("a", 50n),
    ];
    const pool = 999n; // odd pool, will have 1 dust
    const result = allocateWithCap(inputs, pool, 500n);
    // Both get 499 raw, dust goes to the one with highest amount
    // Both are 499, tie-break alphabetically: "a" wins
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(500n));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(499n));
  });

  it("all recipients exceed cap", () => {
    const result = allocateWithCap(
      [input("a", 50n), input("b", 50n)],
      1000n,
      100n,
    );
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(100n));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(100n));
    // 800 is unallocated (everyone at cap, excess returned to treasury)
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(200n);
  });
});
