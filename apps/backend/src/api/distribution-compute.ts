import { runDistributionPipeline } from "@ens-dis/domain";
import { db, publicClients } from "ponder:api";
import { createDataSource } from "../adapters/data-source.js";
import { distributionResult, getAppDb } from "../db/app-tables.js";
import { distributionToJson } from "../output/json-writer.js";
import {
  getDistributionSnapshot,
  parseDistributionRow,
  type ParsedDistribution,
  type DistributionStorageRow,
} from "./distribution-utils.js";
import { getConfiguredRoundMonths, getRoundDateRange } from "./round-config.js";

export type ComputeDistributionStatus = "cached" | "computed" | "skipped";

export interface ComputeDistributionOptions {
  force?: boolean;
  now?: Date;
}

export interface ComputeDistributionResponse {
  month: string;
  status: ComputeDistributionStatus;
  reason?: string;
  computedAt: string | null;
  tierIndex: number | null;
  poolSize: string | null;
  poolSizeEns: string | null;
  totalDistributed: string | null;
  totalDistributedEns: string | null;
  activeVoterCount: number | null;
  eligibleTokenHolderCount: number | null;
  rewardCount: number | null;
  lotteryBucketCount: number | null;
}

export class DistributionComputeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "DistributionComputeError";
  }
}

const inFlightComputations = new Map<string, Promise<ComputeDistributionResponse>>();

export async function computeAndStoreDistribution(
  month: string,
  options: ComputeDistributionOptions = {},
): Promise<ComputeDistributionResponse> {
  const now = options.now ?? new Date();
  const skipped = getSkipResponse(month, now);
  if (skipped) return skipped;

  const key = `${month}:${options.force === true ? "force" : "cached"}`;
  const pending = inFlightComputations.get(key);
  if (pending) return pending;

  const computation = doComputeAndStoreDistribution(month, {
    force: options.force === true,
    now,
  }).finally(() => {
    inFlightComputations.delete(key);
  });

  inFlightComputations.set(key, computation);
  return computation;
}

async function doComputeAndStoreDistribution(
  month: string,
  options: Required<ComputeDistributionOptions>,
): Promise<ComputeDistributionResponse> {
  const existing = (await getStoredDistributionRows()).find((row) => row.month === month);
  if (existing && !options.force) {
    return computeResponse("cached", parseDistributionRow(existing));
  }

  const client = publicClients.mainnet;
  if (!client) {
    throw new DistributionComputeError(500, "Mainnet public client is unavailable");
  }

  const dataSource = createDataSource(db as any, client);
  const result = await runDistributionPipeline(month, dataSource);
  const resultJson = distributionToJson(result);
  const computedAt = BigInt(Math.floor(options.now.getTime() / 1000));

  await storeDistributionResult(month, resultJson, computedAt);

  return computeResponse(
    "computed",
    parseDistributionRow({ month, resultJson, computedAt }),
  );
}

async function getStoredDistributionRows(): Promise<DistributionStorageRow[]> {
  const { db: appDb, ready } = getAppDb();
  await ready;
  const rows = await appDb.select().from(distributionResult);
  return rows as DistributionStorageRow[];
}

async function storeDistributionResult(
  month: string,
  resultJson: string,
  computedAt: bigint,
): Promise<void> {
  const { db: appDb, ready } = getAppDb();
  await ready;
  await appDb
    .insert(distributionResult)
    .values({ month, resultJson, computedAt })
    .onConflictDoUpdate({
      target: distributionResult.month,
      set: { resultJson, computedAt },
    });
}

function getSkipResponse(
  month: string,
  now: Date,
): ComputeDistributionResponse | null {
  const configuredMonths = getConfiguredRoundMonths();
  if (configuredMonths.length > 0 && !configuredMonths.includes(month)) {
    throw new DistributionComputeError(404, `Unknown configured month ${month}`);
  }

  const { endDate } = getRoundDateRange(month);
  if (now.getTime() <= Date.parse(endDate)) {
    return {
      month,
      status: "skipped",
      reason: `Round ${month} has not ended yet`,
      computedAt: null,
      tierIndex: null,
      poolSize: null,
      poolSizeEns: null,
      totalDistributed: null,
      totalDistributedEns: null,
      activeVoterCount: null,
      eligibleTokenHolderCount: null,
      rewardCount: null,
      lotteryBucketCount: null,
    };
  }

  return null;
}

function computeResponse(
  status: ComputeDistributionStatus,
  parsed: ParsedDistribution,
): ComputeDistributionResponse {
  const snapshot = getDistributionSnapshot(parsed);

  return {
    month: parsed.row.month,
    status,
    computedAt: snapshot.computedAt,
    tierIndex: snapshot.tierIndex,
    poolSize: snapshot.poolSize,
    poolSizeEns: snapshot.poolSizeEns,
    totalDistributed: snapshot.totalDistributed,
    totalDistributedEns: snapshot.totalDistributedEns,
    activeVoterCount: snapshot.activeVoterCount,
    eligibleTokenHolderCount: snapshot.eligibleTokenHolderCount,
    rewardCount: parsed.result.rewards.length,
    lotteryBucketCount: parsed.result.lottery.buckets.length,
  };
}
