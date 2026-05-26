import { describe, it, expect } from "vitest";
import {
  combineRewards,
  applyMinimumThreshold,
} from "../../src/combine-rewards.js";
import type { Address, RewardAllocation, CombinedReward, Wei } from "../../src/types.js";
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
  it("handles voter rewards only", () => {
    const voterRewards: RewardAllocation[] = [
      alloc(alice, 5n),
      alloc(bob, 3n),
    ];

    const result = combineRewards(voterRewards, []);

    expect(result).toHaveLength(2);

    const aliceReward = result.find((r) => r.address === alice)!;
    expect(aliceReward.voterReward).toBe(wei(5n * ENS));
    expect(aliceReward.tokenHolderReward).toBe(wei(0n));
    expect(aliceReward.tokenHolderBalance).toBe(wei(0n));
    expect(aliceReward.total).toBe(wei(5n * ENS));

    const bobReward = result.find((r) => r.address === bob)!;
    expect(bobReward.voterReward).toBe(wei(3n * ENS));
    expect(bobReward.tokenHolderReward).toBe(wei(0n));
    expect(bobReward.tokenHolderBalance).toBe(wei(0n));
    expect(bobReward.total).toBe(wei(3n * ENS));
  });

  it("attaches per-address token-holder balance when provided", () => {
    const tokenHolderRewards: RewardAllocation[] = [
      alloc(alice, 10n),
      alloc(carol, 7n),
    ];
    const balances = new Map<Address, Wei>([
      [alice, wei(100n * ENS)],
      [carol, wei(50n * ENS)],
    ]);

    const result = combineRewards([], tokenHolderRewards, balances);

    const aliceReward = result.find((r) => r.address === alice)!;
    expect(aliceReward.tokenHolderBalance).toBe(wei(100n * ENS));

    const carolReward = result.find((r) => r.address === carol)!;
    expect(carolReward.tokenHolderBalance).toBe(wei(50n * ENS));
  });

  it("self-delegating voter keeps both reward and TWB", () => {
    const voterRewards: RewardAllocation[] = [alloc(alice, 3n)];
    const tokenHolderRewards: RewardAllocation[] = [alloc(alice, 12n)];
    const balances = new Map<Address, Wei>([[alice, wei(200n * ENS)]]);

    const result = combineRewards(voterRewards, tokenHolderRewards, balances);

    expect(result).toHaveLength(1);
    expect(result[0].tokenHolderBalance).toBe(wei(200n * ENS));
  });

  it("handles token-holder rewards only", () => {
    const tokenHolderRewards: RewardAllocation[] = [
      alloc(alice, 10n),
      alloc(carol, 7n),
    ];

    const result = combineRewards([], tokenHolderRewards);

    expect(result).toHaveLength(2);

    const aliceReward = result.find((r) => r.address === alice)!;
    expect(aliceReward.voterReward).toBe(wei(0n));
    expect(aliceReward.tokenHolderReward).toBe(wei(10n * ENS));
    expect(aliceReward.total).toBe(wei(10n * ENS));
  });

  it("combines both pools when addresses overlap", () => {
    const voterRewards: RewardAllocation[] = [alloc(alice, 2n)];
    const tokenHolderRewards: RewardAllocation[] = [alloc(alice, 8n)];

    const result = combineRewards(voterRewards, tokenHolderRewards);

    expect(result).toHaveLength(1);
    expect(result[0].address).toBe(alice);
    expect(result[0].voterReward).toBe(wei(2n * ENS));
    expect(result[0].tokenHolderReward).toBe(wei(8n * ENS));
    expect(result[0].total).toBe(wei(10n * ENS));
  });

  it("self-delegating active voter gets both rewards combined", () => {
    // Alice is both an active voter (gets voter reward)
    // and a token holder of herself (gets token-holder reward)
    const voterRewards: RewardAllocation[] = [alloc(alice, 3n)];
    const tokenHolderRewards: RewardAllocation[] = [alloc(alice, 12n)];

    const result = combineRewards(voterRewards, tokenHolderRewards);

    expect(result).toHaveLength(1);
    const r = result[0];
    expect(r.address).toBe(alice);
    expect(r.voterReward).toBe(wei(3n * ENS));
    expect(r.tokenHolderReward).toBe(wei(12n * ENS));
    expect(r.total).toBe(wei(15n * ENS));
  });

  it("handles mix of overlapping and non-overlapping addresses", () => {
    const voterRewards: RewardAllocation[] = [
      alloc(alice, 2n),
      alloc(bob, 1n),
    ];
    const tokenHolderRewards: RewardAllocation[] = [
      alloc(alice, 5n),
      alloc(carol, 4n),
    ];

    const result = combineRewards(voterRewards, tokenHolderRewards);

    expect(result).toHaveLength(3);

    const aliceR = result.find((r) => r.address === alice)!;
    expect(aliceR.total).toBe(wei(7n * ENS));

    const bobR = result.find((r) => r.address === bob)!;
    expect(bobR.voterReward).toBe(wei(1n * ENS));
    expect(bobR.tokenHolderReward).toBe(wei(0n));

    const carolR = result.find((r) => r.address === carol)!;
    expect(carolR.voterReward).toBe(wei(0n));
    expect(carolR.tokenHolderReward).toBe(wei(4n * ENS));
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
        voterReward: wei(1n * ENS),
        tokenHolderReward: wei(0n),
        tokenHolderBalance: wei(0n),
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
        voterReward: wei(halfEns),
        tokenHolderReward: wei(0n),
        tokenHolderBalance: wei(0n),
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
        voterReward: wei(2n * ENS),
        tokenHolderReward: wei(3n * ENS),
        tokenHolderBalance: wei(0n),
        total: wei(5n * ENS),
      },
      {
        address: bob,
        voterReward: wei(0n),
        tokenHolderReward: wei(ENS / 10n),
        tokenHolderBalance: wei(0n),
        total: wei(ENS / 10n),
      },
      {
        address: carol,
        voterReward: wei(1n * ENS),
        tokenHolderReward: wei(0n),
        tokenHolderBalance: wei(0n),
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
        voterReward: wei(ENS / 2n),
        tokenHolderReward: wei(ENS / 2n),
        tokenHolderBalance: wei(0n),
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
        voterReward: wei(justUnder),
        tokenHolderReward: wei(0n),
        tokenHolderBalance: wei(0n),
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
