import { describe, expect, it } from "vitest";
import { validateDistributionResult } from "../../src/pipeline.js";
import type { Address, DistributionResult } from "../../src/types.js";
import { blockNumber, seconds, wei } from "../../src/types.js";

const ENS = 10n ** 18n;
const alice: Address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const bob: Address = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";

function makeResult(
  overrides: Partial<DistributionResult> = {},
): DistributionResult {
  const result: DistributionResult = {
    metadata: {
      month: "2025-06",
      monthStart: seconds(1n),
      monthEnd: seconds(2n),
      startBlock: blockNumber(1n),
      endBlock: blockNumber(2n),
      randaoValue:
        "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
      vpStart: wei(100n * ENS),
      vpEnd: wei(100n * ENS),
      vpGrowthPct: "0.00",
      tier: 0,
      poolSize: wei(5_000n * ENS),
      voterCap: wei(50n * ENS),
      tokenHolderCap: wei(250n * ENS),
      activeVoterCount: 1,
      finalizedProposalIds: ["1"],
    },
    rewards: [
      {
        address: alice,
        voterReward: wei(10n * ENS),
        tokenHolderReward: wei(20n * ENS),
        tokenHolderBalance: wei(0n),
        total: wei(30n * ENS),
      },
    ],
    lottery: {
      buckets: [
        {
          bucketIndex: 0,
          entries: [{ address: bob, amount: wei(1n * ENS), probability: "1.0000" }],
          prize: wei(1n * ENS),
          winner: bob,
        },
      ],
    },
    deduplication: { multiDelegate: [], hedgey: [], walletAliases: [] },
  };

  return { ...result, ...overrides };
}

describe("validateDistributionResult", () => {
  it("accepts a valid result", () => {
    expect(() => validateDistributionResult(makeResult())).not.toThrow();
  });

  it("rejects rewards above caps", () => {
    const result = makeResult({
      rewards: [
        {
          address: alice,
          voterReward: wei(51n * ENS),
          tokenHolderReward: wei(0n),
          tokenHolderBalance: wei(0n),
          total: wei(51n * ENS),
        },
      ],
    });

    expect(() => validateDistributionResult(result)).toThrow(/exceeds cap/i);
  });

  it("rejects lottery winners that are not bucket entries", () => {
    const result = makeResult({
      lottery: {
        buckets: [
          {
            bucketIndex: 0,
            entries: [{ address: alice, amount: wei(1n * ENS), probability: "1.0000" }],
            prize: wei(1n * ENS),
            winner: bob,
          },
        ],
      },
    });

    expect(() => validateDistributionResult(result)).toThrow(/not an entry/i);
  });

  it("rejects distributions above the pool size", () => {
    const result = makeResult({
      metadata: {
        ...makeResult().metadata,
        poolSize: wei(1n * ENS),
      },
    });

    expect(() => validateDistributionResult(result)).toThrow(/pool size/i);
  });
});
