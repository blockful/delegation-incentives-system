import { describe, it, expect } from "vitest";
import { computeDelegateRewards } from "@/domain/delegate-rewards.js";
import { type DelegateScore, wei, ONE_ENS } from "@/domain/types.js";
import { sum } from "@/util/bigint-math.js";

function delegate(
  id: string,
  avp: bigint,
  active: boolean = true,
): DelegateScore {
  return {
    delegateId: id,
    averageVotingPower: wei(avp * ONE_ENS),
    proposalsVoted: active ? 7 : 3,
    isActive: active,
  };
}

describe("computeDelegateRewards", () => {
  const monthlyPool = 10_000n * ONE_ENS;
  // Delegate pool = 10% = 1,000 ENS
  const highCap = 5_000n * ONE_ENS; // high cap for full allocation tests
  const lowCap = 100n * ONE_ENS; // low cap for cap tests

  it("allocates 10% of monthly pool to delegates", () => {
    const delegates = [delegate("a", 50n), delegate("b", 50n)];
    const result = computeDelegateRewards(delegates, monthlyPool, highCap);
    const total = sum(result.map((r) => r.amount as bigint));
    expect(total).toBe(1_000n * ONE_ENS);
  });

  it("distributes proportionally by average voting power", () => {
    const delegates = [delegate("a", 75n), delegate("b", 25n)];
    const result = computeDelegateRewards(delegates, monthlyPool, highCap);
    // Delegate pool = 1000 ENS
    // a gets 75% = 750 ENS, b gets 25% = 250 ENS
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(750n * ONE_ENS));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(250n * ONE_ENS));
  });

  it("filters out inactive delegates", () => {
    const delegates = [
      delegate("a", 50n, true),
      delegate("b", 50n, false), // inactive
    ];
    const result = computeDelegateRewards(delegates, monthlyPool, highCap);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("a");
  });

  it("handles empty delegate list", () => {
    const result = computeDelegateRewards([], monthlyPool, highCap);
    expect(result).toEqual([]);
  });

  it("applies cap and redistributes excess", () => {
    const delegates = [delegate("a", 75n), delegate("b", 25n)];
    const result = computeDelegateRewards(delegates, monthlyPool, lowCap);
    // Both get capped at 100 ENS
    expect(result.find((r) => r.id === "a")!.amount).toBe(wei(lowCap));
    expect(result.find((r) => r.id === "b")!.amount).toBe(wei(lowCap));
  });
});
