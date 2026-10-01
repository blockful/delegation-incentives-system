import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POOL_TIERS, wei, type Address } from "@ens-dis/domain";
import { FakePonderDb } from "../../doubles/fake-ponder-db.js";
import { createTiersApp } from "../../../src/api/routes/tiers.js";
import { createAprApp } from "../../../src/api/routes/apr.js";
import type { CurrentGrowth } from "../../../src/api/helpers.js";

const ENS = 10n ** 18n;
const VOTER = "0x1111111111111111111111111111111111111111" as Address;

// Live: mid-way through the last configured round. Ended: the month after it.
const LIVE_NOW = new Date("2026-05-15T12:00:00.000Z");
const ENDED_NOW = new Date("2026-06-02T12:00:00.000Z");

function makeGrowth(): CurrentGrowth {
  return {
    activeVoters: new Set([VOTER]),
    vpStart: wei(1_000_000n * ENS),
    vpEnd: wei(1_150_000n * ENS),
    growthPct: 15,
    tier: POOL_TIERS[1],
    degraded: false,
  };
}

function makeDb() {
  return new FakePonderDb({
    ens_balance: [],
    ens_delegation: [],
    multi_delegate_position: [],
    ens_voting_power_snapshot: [
      {
        id: `${VOTER}-1-0`,
        voterId: VOTER,
        votingPower: 100_000n * ENS,
        timestamp: 1n,
        blockNumber: 1n,
        logIndex: 0,
      },
    ],
  });
}

beforeEach(() => {
  process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";
});

afterEach(() => {
  process.env.ROUND_MONTHS = "2026-03,2026-04,2026-05";
});

describe("/tiers/progression", () => {
  it("reports the current tier while a round is live", async () => {
    const getGrowth = vi.fn(async () => makeGrowth());
    const res = await createTiersApp({ getGrowth, now: () => LIVE_NOW })
      .request("/tiers/progression");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.programEnded).toBe(false);
    expect(body.currentTierIndex).toBe(1);
    expect(body.currentGrowthPct).toBe("15.00");
    expect(body.tiers[1]).toMatchObject({ isCurrent: true, isUnlocked: true });
    expect(body.tiers[0].estimatedAprPct).not.toBeNull();
  });

  it("nulls every current/projection field once the program has ended", async () => {
    const getGrowth = vi.fn(async () => makeGrowth());
    const res = await createTiersApp({ getGrowth, now: () => ENDED_NOW })
      .request("/tiers/progression");
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      programEnded: true,
      currentTierIndex: null,
      currentTotalVP: null,
      previousTotalVP: null,
      currentGrowthBps: null,
      currentGrowthPct: null,
      activeVoterCount: null,
      maxTokenHolderAprPct: null,
    });
    expect(getGrowth).not.toHaveBeenCalled();

    // Static definitions survive unchanged.
    expect(body.tiers).toHaveLength(POOL_TIERS.length);
    expect(body.tiers[1]).toEqual({
      index: 1,
      momGrowthMinPct: POOL_TIERS[1].minGrowthPct.toString(),
      momGrowthMaxPct: POOL_TIERS[1].maxGrowthPct.toString(),
      poolSizeEns: "8000.000000000000000000",
      voterCapEns: expect.any(String),
      tokenHolderCapEns: expect.any(String),
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: null,
      requiredTotalVP: null,
      estimatedAprPct: null,
    });
  });
});

describe("/apr/:address", () => {
  it("estimates rewards while a round is live", async () => {
    const res = await createAprApp({
      database: makeDb() as any,
      getGrowth: async () => makeGrowth(),
      getActiveVoters: async () => {
        throw new Error("live path must reuse the growth voter set");
      },
      now: () => LIVE_NOW,
    }).request(`/apr/${VOTER}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.programEnded).toBe(false);
    expect(body.role).toBe("voter");
    expect(body.poolSizeEns).toBe("8000.000000000000000000");
    expect(body.userShareWei).toBe((100_000n * ENS).toString());
    expect(body.estimatedMonthlyRewardEns).not.toBeNull();
    expect(body.estimatedAprPct).not.toBeNull();
    expect(typeof body.qualifiesForLottery).toBe("boolean");
  });

  it("returns 200 with null estimates once the program has ended", async () => {
    const getGrowth = vi.fn(async () => makeGrowth());
    const res = await createAprApp({
      database: makeDb() as any,
      getGrowth,
      getActiveVoters: async () => new Set([VOTER]),
      now: () => ENDED_NOW,
    }).request(`/apr/${VOTER}`);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      address: VOTER,
      role: "voter",
      programEnded: true,
      poolSizeEns: null,
      estimatedMonthlyRewardEns: null,
      estimatedAprPct: null,
      userShareWei: null,
      totalShareWei: null,
      qualifiesForLottery: null,
      currentBalanceEns: "0.000000000000000000",
    });
    expect(getGrowth).not.toHaveBeenCalled();
  });
});
