import { describe, expect, it, vi } from "vitest";
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
    activeDelegateCount: status === "skipped" ? null : 42,
    eligibleDelegatorCount: status === "skipped" ? null : 312,
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
});
