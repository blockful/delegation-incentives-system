import { afterEach, describe, expect, it } from "vitest";
import { createDistributionsApp } from "../../../src/api/routes/distributions.js";
import { createRoundsApp, parseRoundMonths } from "../../../src/api/routes/rounds.js";
import type { DistributionStorageRow } from "../../../src/api/distribution-utils.js";

const ENS = 10n ** 18n;

const ADDRESS_A = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const ADDRESS_B = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
const ADDRESS_C = "0xcccccccccccccccccccccccccccccccccccccccc";

function ens(value: bigint): string {
  return (value * ENS).toString();
}

function makeDistributionRow(month = "2026-03"): DistributionStorageRow {
  return {
    month,
    computedAt: 1775000000n,
    resultJson: JSON.stringify({
      metadata: {
        month,
        monthStart: "1772323200",
        monthEnd: "1775001599",
        startBlock: "100",
        endBlock: "200",
        randaoValue: "0xabc",
        vpStart: ens(1_000_000n),
        vpEnd: ens(1_200_000n),
        vpGrowthPct: "20.00",
        tier: 1,
        poolSize: ens(8_000n),
        voterCap: ens(80n),
        tokenHolderCap: ens(400n),
        activeVoterCount: 42,
        finalizedProposalIds: ["1", "2"],
      },
      rewards: [
        {
          address: ADDRESS_A,
          voterReward: ens(100n),
          tokenHolderReward: "0",
          total: ens(100n),
        },
        {
          address: ADDRESS_B,
          voterReward: "0",
          tokenHolderReward: ens(25n),
          total: ens(25n),
        },
        {
          address: ADDRESS_C,
          voterReward: ens(5n),
          tokenHolderReward: ens(15n),
          total: ens(20n),
        },
      ],
      lottery: {
        buckets: [
          {
            bucketIndex: 0,
            entries: [
              {
                address: ADDRESS_B,
                amount: ens(1n),
                probability: "0.5",
              },
            ],
            prize: ens(10n),
            winner: ADDRESS_B,
          },
        ],
      },
      deduplication: {
        multiDelegate: [],
        hedgey: [],
        walletAliases: [],
      },
    }),
  };
}

function makeManyRewardsDistributionRow(
  month = "2026-03",
  count = 12,
): DistributionStorageRow {
  const row = makeDistributionRow(month);
  const result = JSON.parse(row.resultJson);

  result.rewards = Array.from({ length: count }, (_, index) => {
    const rank = BigInt(count - index);
    const address = `0x${(index + 1).toString(16).padStart(40, "0")}`;

    return {
      address,
      voterReward: ens(rank),
      tokenHolderReward: ens(rank),
      total: ens(rank * 2n),
    };
  });
  result.lottery = { buckets: [] };

  return {
    ...row,
    resultJson: JSON.stringify(result),
  };
}

function makeRoundsApp(
  rows: DistributionStorageRow[] = [],
  options: {
    getVotingPowers?: (
      addresses: readonly string[],
      asOfTimestamp: bigint,
    ) => Promise<Map<string, string>>;
  } = {},
) {
  return createRoundsApp({
    getRows: async () => rows,
    getTierSnapshot: async () => ({
      tierIndex: 0,
      poolSizeEns: "5000.000000000000000000",
      vpGrowthPct: "0.00",
    }),
    getVotingPowers: options.getVotingPowers ?? (async () => new Map()),
    now: () => new Date("2026-05-03T12:00:00.000Z"),
  });
}

function makeDistributionsApp(rows: DistributionStorageRow[] = []) {
  return createDistributionsApp({
    getRows: async () => rows,
    now: () => new Date("2026-05-03T12:00:00.000Z"),
  });
}

describe("round month configuration", () => {
  afterEach(() => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";
  });

  it("maps ROUND_MONTHS to round numbers in UTC month order", async () => {
    process.env.ROUND_MONTHS = "2026-05, 2026-03, invalid, 2026-04, 2026-03";

    expect(parseRoundMonths(process.env.ROUND_MONTHS)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
    ]);

    const res = await makeRoundsApp().request("/rounds");
    const body = await res.json();

    expect(body.rounds.map((round: any) => [round.roundNumber, round.month])).toEqual([
      [3, "2026-05"],
      [2, "2026-04"],
      [1, "2026-03"],
    ]);
  });

  it("returns the current round dates in UTC", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp().request("/rounds/current");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.roundNumber).toBe(3);
    expect(body.startDate).toBe("2026-05-01T00:00:00.000Z");
    expect(body.endDate).toBe("2026-05-31T23:59:59.999Z");
    expect(body.poolSizeEns).toBe("5000.000000000000000000");
    expect(body.tierIndex).toBe(0);
  });
});

describe("round reward responses", () => {
  it("lists rounds with truthful missing distribution states", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp().request("/rounds");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.currentRoundNumber).toBe(3);
    expect(body.rounds[0]).toMatchObject({
      roundNumber: 3,
      month: "2026-05",
      status: "live",
      distributionDataStatus: "in_progress",
      poolSizeEns: "5000.000000000000000000",
      vpGrowthPct: "0.00",
      totalDistributedEns: null,
    });
    expect(body.rounds[1]).toMatchObject({
      roundNumber: 2,
      month: "2026-04",
      status: "ended",
      distributionDataStatus: "missing",
      poolSizeEns: null,
      totalDistributedEns: null,
    });
  });

  it("returns round detail rankings from stored distribution data", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp([makeDistributionRow()]).request(
      `/rounds/1?address=${ADDRESS_B}`,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      roundNumber: 1,
      month: "2026-03",
      status: "paid",
      distributionDataStatus: "available",
      tierIndex: 1,
      vpGrowthPct: "20.00",
      poolSizeEns: "8000.000000000000000000",
      totalDistributedEns: "155.000000000000000000",
      lotteryBucketCount: 1,
      lotteryEntryCount: 1,
      lotteryParticipantCount: 1,
      lotteryWinnerCount: 1,
      lotteryPrizeEns: "10.000000000000000000",
    });
    expect(body.addressReward).toMatchObject({
      address: ADDRESS_B,
      rewardStatus: "paid",
      tokenHolderRewardEns: "25.000000000000000000",
      lotteryRewardEns: "10.000000000000000000",
      totalRewardEns: "35.000000000000000000",
    });
    expect(body.topVoterRewards[0]).toMatchObject({
      rank: 1,
      address: ADDRESS_A,
      role: "voter",
      rewardEns: "100.000000000000000000",
    });
    expect(body.topTokenHolderRewards[0]).toMatchObject({
      rank: 1,
      address: ADDRESS_B,
      role: "token_holder",
      rewardEns: "35.000000000000000000",
      source: "combined",
    });
    expect(body.lottery).toMatchObject({
      totalPrizeEns: "10.000000000000000000",
      bucketTargetEns: "10.000000000000000000",
      bucketCount: 1,
      entryCount: 1,
      participantCount: 1,
      winnerCount: 1,
      seed: {
        source: "ethereum_prev_randao",
        value: "0xabc",
        blockNumber: "200",
        algorithm: "keccak256(prevRandao, bucketIndex)",
      },
      buckets: [
        {
          bucketIndex: 0,
          prizeEns: "10.000000000000000000",
          winner: ADDRESS_B,
          winnerProbability: "0.5",
          entryCount: 1,
          entries: [
            {
              bucketIndex: 0,
              entryIndex: 1,
              address: ADDRESS_B,
              amountEns: "1.000000000000000000",
              probability: "0.5",
            },
          ],
        },
      ],
    });
  });

  it("keeps round detail rankings capped at 10 by default", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp([makeManyRewardsDistributionRow()]).request("/rounds/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.topVoterRewards).toHaveLength(10);
    expect(body.topTokenHolderRewards).toHaveLength(10);
    expect(body.topVoterRewards.at(-1)).toMatchObject({
      rank: 10,
      rewardEns: "3.000000000000000000",
    });
    expect(body.topTokenHolderRewards.at(-1)).toMatchObject({
      rank: 10,
      rewardEns: "3.000000000000000000",
    });
  });

  it("returns every round detail ranking row when rewardLimit is all", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp([makeManyRewardsDistributionRow()]).request(
      "/rounds/1?rewardLimit=all",
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.topVoterRewards).toHaveLength(12);
    expect(body.topTokenHolderRewards).toHaveLength(12);
    expect(body.topVoterRewards.at(-1)).toMatchObject({
      rank: 12,
      rewardEns: "1.000000000000000000",
    });
    expect(body.topTokenHolderRewards.at(-1)).toMatchObject({
      rank: 12,
      rewardEns: "1.000000000000000000",
    });
  });

  it("rejects invalid round detail reward limits", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp([makeManyRewardsDistributionRow()]).request(
      "/rounds/1?rewardLimit=0",
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid rewardLimit" });
  });

  it("enriches top voter rewards with round-end voting power", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const captured: Array<{ addresses: string[]; asOf: bigint }> = [];
    const res = await makeRoundsApp([makeDistributionRow()], {
      getVotingPowers: async (addresses, asOf) => {
        captured.push({ addresses: [...addresses], asOf });
        return new Map([
          [ADDRESS_A, ens(7n)],
          [ADDRESS_C, ens(3n)],
        ]);
      },
    }).request("/rounds/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(captured).toHaveLength(1);
    // Only voter addresses are looked up — token holders show TWB from the
    // persisted distribution result, not a current-state VP snapshot.
    expect(captured[0].addresses).toEqual([ADDRESS_A, ADDRESS_C]);
    expect(captured[0].asOf).toBe(1775001599n);
    expect(body.topVoterRewards).toEqual([
      expect.objectContaining({ address: ADDRESS_A, votingPower: ens(7n) }),
      expect.objectContaining({ address: ADDRESS_C, votingPower: ens(3n) }),
    ]);
    // Token holders never get a votingPower value back from this route.
    for (const row of body.topTokenHolderRewards) {
      expect(row.votingPower).toBeNull();
    }
  });

  it("exposes persisted tokenHolderBalance on top token holder rewards", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const row = makeDistributionRow();
    const result = JSON.parse(row.resultJson);
    // Backfill the new field directly on the JSON fixture, matching what the
    // pipeline now writes.
    result.rewards = result.rewards.map((r: any) => {
      if (r.address === ADDRESS_B) {
        return { ...r, tokenHolderBalance: ens(500n) };
      }
      if (r.address === ADDRESS_C) {
        return { ...r, tokenHolderBalance: ens(300n) };
      }
      return r;
    });
    const enrichedRow = { ...row, resultJson: JSON.stringify(result) };

    const res = await makeRoundsApp([enrichedRow]).request("/rounds/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    const holderB = body.topTokenHolderRewards.find(
      (r: any) => r.address === ADDRESS_B,
    );
    const holderC = body.topTokenHolderRewards.find(
      (r: any) => r.address === ADDRESS_C,
    );
    expect(holderB.tokenHolderBalance).toBe(ens(500n));
    expect(holderC.tokenHolderBalance).toBe(ens(300n));
  });

  it("returns null tokenHolderBalance for distributions computed before persistence", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    // makeDistributionRow's fixture omits tokenHolderBalance — exercise the
    // reviveDistributionResult backfill path.
    const res = await makeRoundsApp([makeDistributionRow()]).request("/rounds/1");
    const body = await res.json();

    expect(res.status).toBe(200);
    for (const row of body.topTokenHolderRewards) {
      expect(row.tokenHolderBalance).toBeNull();
    }
  });

  it("returns clean empty detail state when a round has no stored distribution", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeRoundsApp().request(`/rounds/2?address=${ADDRESS_B}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ended");
    expect(body.distributionDataStatus).toBe("missing");
    expect(body.addressReward.rewardStatus).toBe("unavailable");
    expect(body.topVoterRewards).toEqual([]);
    expect(body.topTokenHolderRewards).toEqual([]);
    expect(body.lottery).toBeNull();
  });
});

describe("address-specific distributions", () => {
  it("derives address rewards across configured rounds", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeDistributionsApp([makeDistributionRow()]).request(
      `/distributions?address=${ADDRESS_B}`,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.address).toBe(ADDRESS_B);
    expect(body.rounds.find((round: any) => round.roundNumber === 1)).toMatchObject({
      distributionDataStatus: "available",
      rewardStatus: "paid",
      tokenHolderRewardEns: "25.000000000000000000",
      lotteryRewardEns: "10.000000000000000000",
      totalRewardEns: "35.000000000000000000",
    });
    expect(body.rounds.find((round: any) => round.roundNumber === 3)).toMatchObject({
      distributionDataStatus: "in_progress",
      rewardStatus: "pending",
      totalRewardEns: "0.000000000000000000",
    });
  });

  it("does not fake rewards when no distribution data exists", async () => {
    process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";

    const res = await makeDistributionsApp().request(
      `/distributions?address=${ADDRESS_B}`,
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.rounds).toHaveLength(3);
    expect(body.rounds.every((round: any) => round.totalRewardEns === "0.000000000000000000")).toBe(true);
    expect(body.rounds.find((round: any) => round.roundNumber === 1).rewardStatus).toBe("unavailable");
    expect(body.rounds.find((round: any) => round.roundNumber === 3).rewardStatus).toBe("pending");
  });

  it("keeps the legacy month list shape without an address query", async () => {
    const res = await makeDistributionsApp([
      makeDistributionRow("2026-03"),
      makeDistributionRow("2026-04"),
    ]).request("/distributions");

    expect(await res.json()).toEqual(["2026-04", "2026-03"]);
  });
});
