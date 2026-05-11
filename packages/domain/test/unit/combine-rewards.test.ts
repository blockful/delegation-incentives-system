import { describe, it, expect } from "vitest";
import {
  combineRewards,
  applyMinimumThreshold,
} from "../../src/combine-rewards.js";
import type { Address, RewardAllocation, CombinedReward } from "../../src/types.js";
import { wei } from "../../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ENS = 10n ** 18n;

const alice: Address = "0xAlice000000000000000000000000000000000001";
const bob: Address = "0xBob0000000000000000000000000000000000000002";
const carol: Address = "0xCarol00000000000000000000000000000000000003";

function alloc(address: Address, ens: bigint): RewardAllocation {
  return { address, reward: wei(ens * ENS) };
}

// ---------------------------------------------------------------------------
// combineRewards
// ---------------------------------------------------------------------------

describe("combineRewards", () => {
  it("handles delegate rewards only", () => {
    const delegateRewards: RewardAllocation[] = [
      alloc(alice, 5n),
      alloc(bob, 3n),
    ];

    const result = combineRewards(delegateRewards, []);

    expect(result).toHaveLength(2);

    const aliceReward = result.find((r) => r.address === alice)!;
    expect(aliceReward.delegateReward).toBe(wei(5n * ENS));
    expect(aliceReward.delegatorReward).toBe(wei(0n));
    expect(aliceReward.total).toBe(wei(5n * ENS));

    const bobReward = result.find((r) => r.address === bob)!;
    expect(bobReward.delegateReward).toBe(wei(3n * ENS));
    expect(bobReward.delegatorReward).toBe(wei(0n));
    expect(bobReward.total).toBe(wei(3n * ENS));
  });

  it("handles delegator rewards only", () => {
    const delegatorRewards: RewardAllocation[] = [
      alloc(alice, 10n),
      alloc(carol, 7n),
    ];

    const result = combineRewards([], delegatorRewards);

    expect(result).toHaveLength(2);

    const aliceReward = result.find((r) => r.address === alice)!;
    expect(aliceReward.delegateReward).toBe(wei(0n));
    expect(aliceReward.delegatorReward).toBe(wei(10n * ENS));
    expect(aliceReward.total).toBe(wei(10n * ENS));
  });

  it("combines both pools when addresses overlap", () => {
    const delegateRewards: RewardAllocation[] = [alloc(alice, 2n)];
    const delegatorRewards: RewardAllocation[] = [alloc(alice, 8n)];

    const result = combineRewards(delegateRewards, delegatorRewards);

    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(alice);
    expect(result[0].delegateReward).toBe(wei(2n * ENS));
    expect(result[0].delegatorReward).toBe(wei(8n * ENS));
    expect(result[0].total).toBe(wei(10n * ENS));
  });

  it("self-delegating active delegate gets both rewards combined", () => {
    // Alice is both an active delegate (gets delegate reward)
    // and a delegator to herself (gets delegator reward)
    const delegateRewards: RewardAllocation[] = [alloc(alice, 3n)];
    const delegatorRewards: RewardAllocation[] = [alloc(alice, 12n)];

    const result = combineRewards(delegateRewards, delegatorRewards);

    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.address).toBe(alice);
    expect(r.delegateReward).toBe(wei(3n * ENS));
    expect(r.delegatorReward).toBe(wei(12n * ENS));
    expect(r.total).toBe(wei(15n * ENS));
  });

  it("handles mix of overlapping and non-overlapping addresses", () => {
    const delegateRewards: RewardAllocation[] = [
      alloc(alice, 2n),
      alloc(bob, 1n),
    ];
    const delegatorRewards: RewardAllocation[] = [
      alloc(alice, 5n),
      alloc(carol, 4n),
    ];

    const result = combineRewards(delegateRewards, delegatorRewards);

    expect(result).toHaveLength(3);

    const aliceR = result.find((r) => r.address === alice)!;
    expect(aliceR.total).toBe(wei(7n * ENS));

    const bobR = result.find((r) => r.address === bob)!;
    expect(bobR.delegateReward).toBe(wei(1n * ENS));
    expect(bobR.delegatorReward).toBe(wei(0n));

    const carolR = result.find((r) => r.address === carol)!;
    expect(carolR.delegateReward).toBe(wei(0n));
    expect(carolR.delegatorReward).toBe(wei(4n * ENS));
  });

  it("returns empty array when both pools are empty", () => {
    const result = combineRewards([], []);
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// applyMinimumThreshold
// ---------------------------------------------------------------------------

describe("applyMinimumThreshold", () => {
  it("combined >= 1 ENS goes to direct payouts", () => {
    const combined: CombinedReward[] = [
      {
        address: alice,
        delegateReward: wei(1n * ENS),
        delegatorReward: wei(0n),
        total: wei(1n * ENS),
      },
    ];

    const { directPayouts, lotteryEntries } =
      applyMinimumThreshold(combined);

    expect(directPayouts).toHaveLength(1);
    expect(directPayouts[0].address).toBe(alice);
    expect(lotteryEntries).toHaveLength(0);
  });

  it("combined < 1 ENS goes to lottery entries", () => {
    const halfEns = ENS / 2n;
    const combined: CombinedReward[] = [
      {
        address: bob,
        delegateReward: wei(halfEns),
        delegatorReward: wei(0n),
        total: wei(halfEns),
      },
    ];

    const { directPayouts, lotteryEntries } =
      applyMinimumThreshold(combined);

    expect(directPayouts).toHaveLength(0);
    expect(lotteryEntries).toHaveLength(1);
    expect(lotteryEntries[0].address).toBe(bob);
    expect(lotteryEntries[0].amount).toBe(wei(halfEns));
  });

  it("splits mixed rewards correctly", () => {
    const combined: CombinedReward[] = [
      {
        address: alice,
        delegateReward: wei(2n * ENS),
        delegatorReward: wei(3n * ENS),
        total: wei(5n * ENS),
      },
      {
        address: bob,
        delegateReward: wei(0n),
        delegatorReward: wei(ENS / 10n),
        total: wei(ENS / 10n),
      },
      {
        address: carol,
        delegateReward: wei(1n * ENS),
        delegatorReward: wei(0n),
        total: wei(1n * ENS),
      },
    ];

    const { directPayouts, lotteryEntries } =
      applyMinimumThreshold(combined);

    expect(directPayouts).toHaveLength(2);
    expect(directPayouts.map((r) => r.address).sort()).toEqual(
      [alice, carol].sort(),
    );

    expect(lotteryEntries).toHaveLength(1);
    expect(lotteryEntries[0].address).toBe(bob);
  });

  it("exactly 1 ENS is a direct payout (boundary)", () => {
    const combined: CombinedReward[] = [
      {
        address: alice,
        delegateReward: wei(ENS / 2n),
        delegatorReward: wei(ENS / 2n),
        total: wei(ENS),
      },
    ];

    const { directPayouts, lotteryEntries } =
      applyMinimumThreshold(combined);

    expect(directPayouts).toHaveLength(1);
    expect(lotteryEntries).toHaveLength(0);
  });

  it("1 wei below threshold goes to lottery", () => {
    const justUnder = ENS - 1n;
    const combined: CombinedReward[] = [
      {
        address: alice,
        delegateReward: wei(justUnder),
        delegatorReward: wei(0n),
        total: wei(justUnder),
      },
    ];

    const { directPayouts, lotteryEntries } =
      applyMinimumThreshold(combined);

    expect(directPayouts).toHaveLength(0);
    expect(lotteryEntries).toHaveLength(1);
  });

  it("returns empty for empty input", () => {
    const { directPayouts, lotteryEntries } = applyMinimumThreshold([]);
    expect(directPayouts).toEqual([]);
    expect(lotteryEntries).toEqual([]);
  });
});
