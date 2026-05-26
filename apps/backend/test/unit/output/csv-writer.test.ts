import { describe, it, expect } from "vitest";
import { distributionToCsv } from "../../../src/output/csv-writer.js";
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
        tokenHolderBalance: wei(0n),
        total: wei(150000000000000000000n),
      },
      {
        address: "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        voterReward: wei(0n),
        tokenHolderReward: wei(25000000000000000000n),
        tokenHolderBalance: wei(0n),
        total: wei(25000000000000000000n),
      },
      {
        address: "0xdddddddddddddddddddddddddddddddddddddd",
        voterReward: wei(75000000000000000000n),
        tokenHolderReward: wei(0n),
        tokenHolderBalance: wei(0n),
        total: wei(75000000000000000000n),
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

describe("distributionToCsv", () => {
  it("starts with the correct header", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    expect(lines[0]).toBe(
      "address,voter_reward,token_holder_reward,combined_reward,role,payout_type",
    );
  });

  it("has correct number of rows", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // 1 header + 3 rewards + 1 lottery winner not in rewards = 5
    expect(lines).toHaveLength(5);
  });

  it("serializes Wei values as decimal strings", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    const firstReward = lines[1].split(",");
    expect(firstReward[1]).toBe("100000000000000000000"); // voter_reward
    expect(firstReward[2]).toBe("50000000000000000000"); // token_holder_reward
    expect(firstReward[3]).toBe("150000000000000000000"); // combined_reward
  });

  it("assigns correct role for voter+token-holder", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // First reward: has both voter and token-holder rewards
    const fields = lines[1].split(",");
    expect(fields[4]).toBe("both");
  });

  it("assigns correct role for token-holder-only", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // Second reward: only token-holder reward
    const fields = lines[2].split(",");
    expect(fields[4]).toBe("token_holder");
  });

  it("assigns correct role for voter-only", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // Third reward: only voter reward
    const fields = lines[3].split(",");
    expect(fields[4]).toBe("voter");
  });

  it("assigns 'direct' payout_type for non-lottery recipients", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // Second reward is not a lottery winner
    const fields = lines[2].split(",");
    expect(fields[5]).toBe("direct");
  });

  it("includes lottery winners not in rewards list", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // The lottery winner (0xcccc...) is not in the rewards list
    const lastLine = lines[lines.length - 1].split(",");
    expect(lastLine[0]).toBe(
      "0xcccccccccccccccccccccccccccccccccccccccc",
    );
    expect(lastLine[1]).toBe("0"); // voter_reward
    expect(lastLine[2]).toBe("0"); // token_holder_reward
    expect(lastLine[3]).toBe("5000000000000000000"); // prize as combined_reward
    expect(lastLine[5]).toBe("lottery");
  });

  it("does not duplicate lottery winners already in rewards", () => {
    // Lottery winner is also a reward recipient
    const result = makeResult({
      lottery: {
        buckets: [
          {
            bucketIndex: 0,
            entries: [],
            prize: wei(5000000000000000000n),
            winner: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          },
        ],
      },
    });
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // 1 header + 3 rewards, no extra lottery row
    expect(lines).toHaveLength(4);

    // The winner in the rewards list is marked as lottery payout_type
    const winnerLine = lines[1].split(",");
    expect(winnerLine[0]).toBe(
      "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    );
    expect(winnerLine[5]).toBe("lottery");
  });

  it("handles empty rewards", () => {
    const result = makeResult({
      rewards: [],
      lottery: { buckets: [] },
    });
    const csv = distributionToCsv(result);
    const lines = csv.trim().split("\n");

    // Just the header
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("address");
  });

  it("ends with a newline", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);
    expect(csv.endsWith("\n")).toBe(true);
  });

  it("preserves address casing", () => {
    const result = makeResult();
    const csv = distributionToCsv(result);

    expect(csv).toContain("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(csv).toContain("0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb");
  });
});
