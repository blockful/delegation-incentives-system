import { describe, expect, it, vi } from "vitest";
import { BlockNotFinalizedError, monthEndTimestamp } from "@ens-dis/domain";
import {
  runAutomaticDistributionScan,
  shouldAttemptMonth,
} from "../../../src/api/distribution-scheduler.js";
import type { ComputeDistributionResponse } from "../../../src/api/distribution-compute.js";

function makeResponse(
  month: string,
  status: ComputeDistributionResponse["status"],
): ComputeDistributionResponse {
  return {
    month,
    status,
    computedAt: status === "skipped" ? null : "2026-05-01T01:30:00.000Z",
    tierIndex: status === "skipped" ? null : 1,
    poolSize: status === "skipped" ? null : "8000000000000000000000",
    poolSizeEns: status === "skipped" ? null : "8000.000000000000000000",
    totalDistributed: status === "skipped" ? null : "155000000000000000000",
    totalDistributedEns: status === "skipped" ? null : "155.000000000000000000",
    activeVoterCount: status === "skipped" ? null : 42,
    eligibleTokenHolderCount: status === "skipped" ? null : 312,
    rewardCount: status === "skipped" ? null : 3,
    lotteryBucketCount: status === "skipped" ? null : 1,
  };
}

function makeLogger() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}

describe("automatic distribution scheduler", () => {
  it("only attempts ended months after the configured grace period", async () => {
    const computeDistribution = vi.fn(async (month: string) =>
      makeResponse(month, month === "2026-03" ? "cached" : "computed"),
    );

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:30:00.000Z"),
      getRoundMonths: () => ["2026-03", "2026-04", "2026-05"],
      graceMs: 60 * 60 * 1000,
      isReady: async () => true,
      getFinalizedTimestamp: async () => monthEndTimestamp("2026-04") + 3600n,
      computeDistribution,
      logger: makeLogger(),
    });

    expect(computeDistribution).toHaveBeenCalledTimes(2);
    expect(computeDistribution.mock.calls.map(([month]) => month)).toEqual([
      "2026-03",
      "2026-04",
    ]);
    expect(result).toMatchObject({
      ready: true,
      checkedMonths: ["2026-03", "2026-04"],
      computedMonths: ["2026-04"],
      cachedMonths: ["2026-03"],
      skippedMonths: [],
      failedMonths: [],
    });
  });

  it("defers processing until the indexer is ready", async () => {
    const computeDistribution = vi.fn(async (month: string) =>
      makeResponse(month, "computed"),
    );

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:30:00.000Z"),
      getRoundMonths: () => ["2026-04"],
      graceMs: 0,
      isReady: async () => false,
      computeDistribution,
      logger: makeLogger(),
    });

    expect(computeDistribution).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ready: false,
      checkedMonths: [],
      computedMonths: [],
    });
  });

  it("continues scanning when one month fails", async () => {
    const computeDistribution = vi.fn(async (month: string) => {
      if (month === "2026-03") throw new Error("database unavailable");
      return makeResponse(month, "computed");
    });

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:30:00.000Z"),
      getRoundMonths: () => ["2026-03", "2026-04"],
      graceMs: 0,
      isReady: async () => true,
      getFinalizedTimestamp: async () => monthEndTimestamp("2026-04") + 3600n,
      computeDistribution,
      logger: makeLogger(),
    });

    expect(computeDistribution).toHaveBeenCalledTimes(2);
    expect(result.computedMonths).toEqual(["2026-04"]);
    expect(result.failedMonths).toEqual([
      { month: "2026-03", error: "database unavailable" },
    ]);
  });

  it("uses UTC month end plus grace to decide eligibility", () => {
    expect(
      shouldAttemptMonth(
        "2026-04",
        new Date("2026-05-01T00:30:00.000Z"),
        60 * 60 * 1000,
      ),
    ).toBe(false);

    expect(
      shouldAttemptMonth(
        "2026-04",
        new Date("2026-05-01T01:00:00.000Z"),
        60 * 60 * 1000,
      ),
    ).toBe(true);
  });

  it("defers a month whose end block falls inside the finality lag window", async () => {
    const monthEnd = monthEndTimestamp("2026-04");
    const computeDistribution = vi.fn(async (month: string) =>
      makeResponse(month, "computed"),
    );

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:00:00.000Z"),
      getRoundMonths: () => ["2026-04"],
      graceMs: 0,
      isReady: async () => true,
      getFinalizedTimestamp: async () => monthEnd - 60n, // head still behind month end
      computeDistribution,
      logger: makeLogger(),
    });

    expect(computeDistribution).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      ready: true,
      checkedMonths: [],
      computedMonths: [],
      deferredMonths: ["2026-04"],
      failedMonths: [],
    });
  });

  it("computes a month once its end block is finalized", async () => {
    const monthEnd = monthEndTimestamp("2026-04");
    const computeDistribution = vi.fn(async (month: string) =>
      makeResponse(month, "computed"),
    );

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:00:00.000Z"),
      getRoundMonths: () => ["2026-04"],
      graceMs: 0,
      isReady: async () => true,
      getFinalizedTimestamp: async () => monthEnd + 60n, // head past month end
      computeDistribution,
      logger: makeLogger(),
    });

    expect(computeDistribution).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      ready: true,
      checkedMonths: ["2026-04"],
      computedMonths: ["2026-04"],
      deferredMonths: [],
      failedMonths: [],
    });
  });

  it("defers (does not fail) when the finalized head cannot be fetched", async () => {
    const computeDistribution = vi.fn(async (month: string) =>
      makeResponse(month, "computed"),
    );
    const logger = makeLogger();

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:00:00.000Z"),
      getRoundMonths: () => ["2026-04"],
      graceMs: 0,
      isReady: async () => true,
      getFinalizedTimestamp: async () => {
        throw new Error("rpc down");
      },
      computeDistribution,
      logger,
    });

    expect(computeDistribution).not.toHaveBeenCalled();
    expect(result.deferredMonths).toEqual(["2026-04"]);
    expect(result.failedMonths).toEqual([]);
    expect(logger.warn).toHaveBeenCalled();
  });

  it("treats a BlockNotFinalizedError from compute as a deferral, not a failure", async () => {
    const monthEnd = monthEndTimestamp("2026-04");
    const computeDistribution = vi.fn(async () => {
      throw new BlockNotFinalizedError(monthEnd, monthEnd - 1n, 100n);
    });
    const logger = makeLogger();

    const result = await runAutomaticDistributionScan({
      now: () => new Date("2026-05-01T01:00:00.000Z"),
      getRoundMonths: () => ["2026-04"],
      graceMs: 0,
      isReady: async () => true,
      getFinalizedTimestamp: async () => monthEnd + 60n, // gate passes...
      computeDistribution, // ...but compute still throws (simulated finality race)
      logger,
    });

    expect(result.deferredMonths).toEqual(["2026-04"]);
    expect(result.failedMonths).toEqual([]);
    expect(logger.error).not.toHaveBeenCalled();
  });
});
