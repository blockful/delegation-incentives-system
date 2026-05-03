import { runDistributionPipeline } from "@ens-dis/domain";
import { db, publicClients } from "ponder:api";
import { distributionResult } from "ponder:schema";
import postgres from "postgres";
import { createDataSource } from "../adapters/data-source.js";
import { distributionToJson } from "../output/json-writer.js";
import {
  getDistributionSnapshot,
  parseDistributionRow,
  type ParsedDistribution,
  type DistributionStorageRow,
} from "./distribution-utils.js";
import { getConfiguredRoundMonths, getRoundDateRange } from "./round-config.js";

export type ComputeDistributionStatus = "cached" | "computed";

export interface ComputeDistributionOptions {
  force?: boolean;
  now?: Date;
}

export interface ComputeDistributionResponse {
  month: string;
  status: ComputeDistributionStatus;
  computedAt: string;
  tierIndex: number;
  poolSize: string;
  poolSizeEns: string;
  totalDistributed: string;
  totalDistributedEns: string;
  activeDelegateCount: number;
  eligibleDelegatorCount: number;
  rewardCount: number;
  lotteryBucketCount: number;
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
let distributionWriteSql: ReturnType<typeof postgres> | null = null;

export async function computeAndStoreDistribution(
  month: string,
  options: ComputeDistributionOptions = {},
): Promise<ComputeDistributionResponse> {
  const now = options.now ?? new Date();
  validateComputableMonth(month, now);

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
  const rows = await db.select().from(distributionResult);
  return rows as DistributionStorageRow[];
}

async function storeDistributionResult(
  month: string,
  resultJson: string,
  computedAt: bigint,
): Promise<void> {
  const writeSql = getDistributionWriteSql();

  await writeSql`
    insert into distribution_result (month, result_json, computed_at)
    values (${month}, ${resultJson}, ${computedAt.toString()})
    on conflict (month) do update
      set result_json = excluded.result_json,
          computed_at = excluded.computed_at
  `;
}

function getDistributionWriteSql(): ReturnType<typeof postgres> {
  if (distributionWriteSql) return distributionWriteSql;

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new DistributionComputeError(
      500,
      "DATABASE_URL is required to store distribution results",
    );
  }

  distributionWriteSql = postgres(databaseUrl, { max: 1 });
  return distributionWriteSql;
}

function validateComputableMonth(month: string, now: Date): void {
  const configuredMonths = getConfiguredRoundMonths();
  if (configuredMonths.length > 0 && !configuredMonths.includes(month)) {
    throw new DistributionComputeError(404, `Unknown configured month ${month}`);
  }

  const { endDate } = getRoundDateRange(month);
  if (now.getTime() <= Date.parse(endDate)) {
    throw new DistributionComputeError(
      409,
      `Round ${month} has not ended yet`,
    );
  }
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
    activeDelegateCount: snapshot.activeDelegateCount,
    eligibleDelegatorCount: snapshot.eligibleDelegatorCount,
    rewardCount: parsed.result.rewards.length,
    lotteryBucketCount: parsed.result.lottery.buckets.length,
  };
}
