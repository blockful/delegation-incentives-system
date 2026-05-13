import { describe, it, expect } from "vitest";
import { distributionToJson } from "../../../src/output/json-writer.js";
import type { DistributionResult } from "@ens-dis/domain";
import {
  wei,
  seconds,
  blockNumber,
} from "@ens-dis/domain";

function makeResult(
  overrides: Partial<DistributionResult> = {},
): DistributionResult {
  return {
    metadata: {
      month: "2026-03",
      monthStart: seconds(1709251200n),
      monthEnd: seconds(1711929600n),
      startBlock: blockNumber(19300000n),
      endBlock: blockNumber(19600000n),
      randaoValue: "0xabc123",
      vpStart: wei(1000000000000000000000n),
      vpEnd: wei(1200000000000000000000n),
      vpGrowthPct: "20.0",
      tier: 2,
      poolSize: wei(50000000000000000000000n),
      voterCap: wei(500000000000000000000n),
      tokenHolderCap: wei(2500000000000000000000n),
      activeVoterCount: 42,
      finalizedProposalIds: ["12345", "67890"],
    },
    rewards: [
      {
        address: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        voterReward: wei(100000000000000000000n),
        tokenHolderReward: wei(50000000000000000000n),
        total: wei(150000000000000000000n),
      },
      {
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        voterReward: wei(0n),
        tokenHolderReward: wei(25000000000000000000n),
        total: wei(25000000000000000000n),
      },
    ],
    lottery: {
      buckets: [
        {
          bucketIndex: 0,
          entries: [
            {
              address: "0xcccccccccccccccccccccccccccccccccccccccc",
              amount: wei(10000000000000000000n),
              probability: "0.5",
            },
          ],
          prize: wei(5000000000000000000n),
          winner: "0xcccccccccccccccccccccccccccccccccccccccc",
        },
      ],
    },
    deduplication: {
      multiDelegate: [],
      hedgey: [],
      walletAliases: [],
    },
    ...overrides,
  };
}

describe("distributionToJson", () => {
  it("returns valid JSON", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("serializes BigInt values as decimal strings", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    // metadata fields
    expect(parsed.metadata.monthStart).toBe("1709251200");
    expect(parsed.metadata.monthEnd).toBe("1711929600");
    expect(parsed.metadata.startBlock).toBe("19300000");
    expect(parsed.metadata.endBlock).toBe("19600000");
    expect(parsed.metadata.vpStart).toBe("1000000000000000000000");
    expect(parsed.metadata.vpEnd).toBe("1200000000000000000000");
    expect(parsed.metadata.poolSize).toBe("50000000000000000000000");
    expect(parsed.metadata.voterCap).toBe("500000000000000000000");
    expect(parsed.metadata.tokenHolderCap).toBe("2500000000000000000000");
  });

  it("serializes reward Wei values as decimal strings", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.rewards[0].voterReward).toBe("100000000000000000000");
    expect(parsed.rewards[0].tokenHolderReward).toBe("50000000000000000000");
    expect(parsed.rewards[0].total).toBe("150000000000000000000");
    expect(parsed.rewards[1].voterReward).toBe("0");
    expect(parsed.rewards[1].tokenHolderReward).toBe("25000000000000000000");
  });

  it("serializes lottery prize as decimal string", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.lottery.buckets[0].prize).toBe("5000000000000000000");
    expect(parsed.lottery.buckets[0].entries[0].amount).toBe(
      "10000000000000000000",
    );
  });

  it("preserves non-BigInt fields unchanged", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.metadata.month).toBe("2026-03");
    expect(parsed.metadata.randaoValue).toBe("0xabc123");
    expect(parsed.metadata.vpGrowthPct).toBe("20.0");
    expect(parsed.metadata.tier).toBe(2);
    expect(parsed.metadata.activeVoterCount).toBe(42);
    expect(parsed.metadata.finalizedProposalIds).toEqual(["12345", "67890"]);
  });

  it("preserves addresses as strings", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.rewards[0].address).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(parsed.lottery.buckets[0].winner).toBe(
      "0xcccccccccccccccccccccccccccccccccccccccc",
    );
  });

  it("includes deduplication log", () => {
    const result = makeResult({
      deduplication: {
        multiDelegate: [
          {
            erc1155Holder: "0x1111111111111111111111111111111111111111",
            voter: "0x2222222222222222222222222222222222222222",
            amount: wei(10n),
          },
        ],
        hedgey: [
          {
            vestingContract: "0x3333333333333333333333333333333333333333",
            nftOwner: "0x4444444444444444444444444444444444444444",
            planId: "99",
          },
        ],
        walletAliases: [
          {
            secondary: "0x5555555555555555555555555555555555555555",
            primary: "0x6666666666666666666666666666666666666666",
          },
        ],
      },
    });
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.deduplication.multiDelegate).toHaveLength(1);
    expect(parsed.deduplication.multiDelegate[0].amount).toBe("10");
    expect(parsed.deduplication.hedgey).toHaveLength(1);
    expect(parsed.deduplication.hedgey[0].planId).toBe("99");
    expect(parsed.deduplication.walletAliases).toHaveLength(1);
  });

  it("handles empty rewards and lottery", () => {
    const result = makeResult({
      rewards: [],
      lottery: { buckets: [] },
    });
    const json = distributionToJson(result);
    const parsed = JSON.parse(json);

    expect(parsed.rewards).toEqual([]);
    expect(parsed.lottery.buckets).toEqual([]);
  });

  it("produces pretty-printed output", () => {
    const result = makeResult();
    const json = distributionToJson(result);
    // Pretty-printed JSON has newlines
    expect(json).toContain("\n");
    // And 2-space indentation
    expect(json).toContain('  "metadata"');
  });
});
