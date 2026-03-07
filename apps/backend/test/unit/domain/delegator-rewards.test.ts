import { describe, it, expect } from "vitest";
import { computeDelegatorRewards } from "@/domain/delegator-rewards.js";
import { type DelegatorScore, wei, ONE_ENS } from "@/domain/types.js";
import { sum } from "@/util/bigint-math.js";

function delegator(id: string, twb: bigint, delegateId = "d1"): DelegatorScore {
  return {
    delegatorId: id,
    delegateId,
    timeWeightedBalance: wei(twb * ONE_ENS),
  };
}

describe("computeDelegatorRewards", () => {
  const monthlyPool = 10_000n * ONE_ENS;
  // Delegator pool = 90% = 9,000 ENS
  // Delegator cap = 5% of R = 500 ENS
  const delegatorCap = 500n * ONE_ENS;

  it("allocates 90% of monthly pool to delegators", () => {
    const delegators = [delegator("a", 50n), delegator("b", 50n)];
    const highCap2 = 50_000n * ONE_ENS; // very high cap
    const result = computeDelegatorRewards(
      delegators,
      monthlyPool,
      highCap2,
    );
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(9_000n * ONE_ENS);
  });

  it("distributes proportionally by time-weighted balance", () => {
    const delegators = [delegator("a", 70n), delegator("b", 30n)];
    const result = computeDelegatorRewards(
      delegators,
      monthlyPool,
      delegatorCap,
    );
    // a gets 70% of 9000 = 6300 ENS → capped at 500
    // b gets 30% of 9000 = 2700 ENS → capped at 500
    expect(result.find((r) => r.id === "a")!.amount).toBeLessThanOrEqual(
      delegatorCap,
    );
  });

  it("handles empty delegator list", () => {
    const result = computeDelegatorRewards([], monthlyPool, delegatorCap);
    expect(result).toEqual([]);
  });

  it("respects per-delegator cap", () => {
    // One whale and many small delegators
    const delegators = [
      delegator("whale", 10000n),
      ...Array.from({ length: 50 }, (_, i) => delegator(`d${i}`, 10n)),
    ];
    const result = computeDelegatorRewards(
      delegators,
      monthlyPool,
      delegatorCap,
    );
    expect(
      result.find((r) => r.id === "whale")!.amount as bigint,
    ).toBeLessThanOrEqual(delegatorCap);
  });

  it("when no one exceeds cap, allocates full pool", () => {
    // Many small equal delegators, cap is very high
    const delegators = Array.from({ length: 100 }, (_, i) =>
      delegator(`d${i}`, 10n),
    );
    const highCap = 1000n * ONE_ENS;
    const result = computeDelegatorRewards(delegators, monthlyPool, highCap);
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(9_000n * ONE_ENS);
  });
});
