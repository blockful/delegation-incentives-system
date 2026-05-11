import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { distributionResult } from "ponder:schema";
import { desc } from "drizzle-orm";
import { distributionToCsv } from "../../output/csv-writer.js";
import {
  DistributionComputeError,
  computeAndStoreDistribution,
  type ComputeDistributionOptions,
  type ComputeDistributionResponse,
} from "../distribution-compute.js";
import { normalizeAddress } from "../helpers.js";
import {
  distributionToApiResponse,
  getAddressReward,
  parseDistributionRow,
  parseDistributionRows,
  type DistributionStorageRow,
} from "../distribution-utils.js";
import {
  type DistributionDataStatus,
  type RoundStatus,
  getConfiguredRoundMonths,
  getRoundDateRange,
  getRoundNumber,
  getRoundTiming,
} from "../round-config.js";

const MonthParam = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .openapi({ param: { name: "month", in: "path" }, example: "2026-03" }),
});

const DistributionMonthListResponse = z.array(
  z.string().openapi({ example: "2026-03" }),
);

const AddressDistributionRoundSchema = z.object({
  roundNumber: z.number(),
  month: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  roundStatus: z.enum(["live", "ended", "pending", "paid"]),
  distributionDataStatus: z.enum(["available", "in_progress", "missing", "not_started"]),
  rewardStatus: z.enum(["paid", "no_reward", "not_eligible", "pending", "unavailable"]),
  delegateReward: z.string(),
  delegateRewardEns: z.string(),
  tokenHolderReward: z.string(),
  tokenHolderRewardEns: z.string(),
  lotteryReward: z.string(),
  lotteryRewardEns: z.string(),
  totalReward: z.string(),
  totalRewardEns: z.string(),
});

const AddressDistributionHistoryResponse = z.object({
  address: z.string(),
  rounds: z.array(AddressDistributionRoundSchema),
});

const ComputeDistributionResponseSchema = z.object({
  month: z.string(),
  status: z.enum(["cached", "computed", "skipped"]),
  reason: z.string().optional(),
  computedAt: z.string().nullable(),
  tierIndex: z.number().nullable(),
  poolSize: z.string().nullable(),
  poolSizeEns: z.string().nullable(),
  totalDistributed: z.string().nullable(),
  totalDistributedEns: z.string().nullable(),
  activeDelegateCount: z.number().nullable(),
  eligibleDelegatorCount: z.number().nullable(),
  rewardCount: z.number().nullable(),
  lotteryBucketCount: z.number().nullable(),
});

type AddressDistributionRewardStatus =
  | "paid"
  | "no_reward"
  | "not_eligible"
  | "pending"
  | "unavailable";

interface AddressDistributionRound {
  roundNumber: number;
  month: string;
  startDate: string;
  endDate: string;
  roundStatus: RoundStatus;
  distributionDataStatus: DistributionDataStatus;
  rewardStatus: AddressDistributionRewardStatus;
  delegateReward: string;
  delegateRewardEns: string;
  tokenHolderReward: string;
  tokenHolderRewardEns: string;
  lotteryReward: string;
  lotteryRewardEns: string;
  totalReward: string;
  totalRewardEns: string;
}

export interface DistributionRouteDeps {
  getRows?: () => Promise<DistributionStorageRow[]>;
  computeDistribution?: (
    month: string,
    options: ComputeDistributionOptions,
  ) => Promise<ComputeDistributionResponse>;
  adminToken?: string | null;
  now?: () => Date;
}

async function getStoredDistributionRows(): Promise<DistributionStorageRow[]> {
  const rows = await db
    .select()
    .from(distributionResult)
    .orderBy(desc(distributionResult.month));

  return rows as DistributionStorageRow[];
}

const listRoute = createRoute({
  method: "get",
  path: "/distributions",
  tags: ["Distributions"],
  summary: "List distribution months or address history",
  description:
    "Without query parameters, returns an array of YYYY-MM month strings for computed distributions. With ?address=0x..., returns that address's per-round distribution history derived from stored results.",
  request: {
    query: z.object({
      address: z.string().optional().openapi({
        description: "Optional Ethereum address for address-specific distribution history",
        example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      }),
    }),
  },
  responses: {
    200: {
      description: "Distribution month list or address distribution history",
      content: {
        "application/json": {
          schema: z.union([
            DistributionMonthListResponse,
            AddressDistributionHistoryResponse,
          ]),
        },
      },
    },
    400: {
      description: "Invalid address",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const getRoute = createRoute({
  method: "get",
  path: "/distributions/{month}",
  tags: ["Distributions"],
  summary: "Get distribution for a month",
  description: "Returns the curated distribution result for the requested month.",
  request: { params: MonthParam },
  responses: {
    200: {
      description: "Distribution result",
      content: { "application/json": { schema: z.object({}).passthrough() } },
    },
    400: {
      description: "Invalid month format",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Distribution not found",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const csvRoute = createRoute({
  method: "get",
  path: "/distributions/{month}/csv",
  tags: ["Distributions"],
  summary: "Download distribution CSV",
  description: "Returns the distribution for the requested month as a downloadable CSV file.",
  request: { params: MonthParam },
  responses: {
    200: {
      description: "CSV file",
      content: { "text/csv": { schema: z.string() } },
    },
    400: {
      description: "Invalid month format",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Distribution not found",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const computeRoute = createRoute({
  method: "post",
  path: "/distributions/{month}/compute",
  tags: ["Distributions"],
  summary: "Compute and store a monthly distribution",
  description:
    "Runs the domain distribution pipeline for an ended configured round and stores the result in distribution_result. Live or future rounds are skipped without writing. Set DISTRIBUTION_ADMIN_TOKEN to require authorization.",
  request: {
    params: MonthParam,
    body: {
      required: false,
      content: {
        "application/json": {
          schema: z.object({
            force: z.boolean().optional().openapi({
              description: "Recompute and overwrite an existing cached result",
              example: false,
            }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: "Distribution was already cached, computed, or skipped because the round has not ended",
      content: { "application/json": { schema: ComputeDistributionResponseSchema } },
    },
    401: {
      description: "Missing or invalid admin token",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Unknown configured month",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

export function createDistributionsApp(deps: DistributionRouteDeps = {}) {
  const app = new OpenAPIHono();
  const getRows = deps.getRows ?? getStoredDistributionRows;
  const computeDistribution = deps.computeDistribution ?? computeAndStoreDistribution;
  const adminToken = deps.adminToken ?? process.env.DISTRIBUTION_ADMIN_TOKEN ?? null;
  const getNow = deps.now ?? (() => new Date());

  app.openapi(listRoute, async (c) => {
    try {
      const { address: rawAddress } = c.req.valid("query");
      const rows = await getRows();

      if (rawAddress) {
        const address = normalizeAddress(rawAddress);
        if (!address) {
          return c.json({ error: "Invalid Ethereum address" }, 400);
        }

        return c.json(
          buildAddressDistributionHistory(rows, address, getNow()),
          200,
        );
      }

      const months = [...new Set(rows.map((row) => row.month))].sort().reverse();
      return c.json(months, 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(getRoute, async (c) => {
    try {
      const { month } = c.req.valid("param");
      const rows = await getRows();
      const row = rows.find((candidate) => candidate.month === month);

      if (!row) {
        return c.json({ error: `No distribution found for month ${month}` }, 404);
      }

      return c.json(distributionToApiResponse(parseDistributionRow(row)), 200);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(csvRoute, async (c) => {
    try {
      const { month } = c.req.valid("param");
      const rows = await getRows();
      const row = rows.find((candidate) => candidate.month === month);

      if (!row) {
        return c.json({ error: `No distribution found for month ${month}` }, 404);
      }

      const { result } = parseDistributionRow(row);
      const csv = distributionToCsv(result);

      return c.text(csv, 200, {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="distribution-${month}.csv"`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(computeRoute, async (c) => {
    try {
      const { month } = c.req.valid("param");
      if (!isComputeAuthorized(c, adminToken)) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const body = await c.req.json().catch(() => ({}));
      const result = await computeDistribution(month, {
        force: body?.force === true,
        now: getNow(),
      });

      return c.json(result, 200);
    } catch (err) {
      if (err instanceof DistributionComputeError) {
        const status = err.status === 404 ? 404 : 500;
        return c.json({ error: err.message }, status);
      }

      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  return app;
}

function isComputeAuthorized(c: any, adminToken: string | null): boolean {
  if (!adminToken) return true;

  const headerToken = c.req.header("x-distribution-admin-token");
  if (headerToken === adminToken) return true;

  const authorization = c.req.header("authorization");
  return authorization === `Bearer ${adminToken}`;
}

function buildAddressDistributionHistory(
  rows: readonly DistributionStorageRow[],
  address: string,
  now: Date,
) {
  const parsedRows = parseDistributionRows(rows);
  const configuredMonths = getConfiguredRoundMonths();
  const months = configuredMonths.length > 0
    ? configuredMonths
    : [...parsedRows.keys()].sort();

  return {
    address,
    rounds: months
      .map((month, index) => {
        const roundNumber = getRoundNumber(month, months) ?? index + 1;
        const range = getRoundDateRange(month);
        const parsed = parsedRows.get(month);
        const timing = getRoundTiming(month, now, parsed != null);

        if (!parsed) {
          return {
            roundNumber,
            month,
            startDate: range.startDate,
            endDate: range.endDate,
            roundStatus: timing.status,
            distributionDataStatus: timing.distributionDataStatus,
            rewardStatus: (timing.distributionDataStatus === "in_progress"
              ? "pending"
              : "unavailable") as AddressDistributionRewardStatus,
            delegateReward: "0",
            delegateRewardEns: "0.000000000000000000",
            tokenHolderReward: "0",
            tokenHolderRewardEns: "0.000000000000000000",
            lotteryReward: "0",
            lotteryRewardEns: "0.000000000000000000",
            totalReward: "0",
            totalRewardEns: "0.000000000000000000",
          } satisfies AddressDistributionRound;
        }

        const reward = getAddressReward(parsed, address);

        return {
          roundNumber,
          month,
          startDate: range.startDate,
          endDate: range.endDate,
          roundStatus: timing.status,
          distributionDataStatus: timing.distributionDataStatus,
          rewardStatus: reward.status,
          delegateReward: reward.delegateReward,
          delegateRewardEns: reward.delegateRewardEns,
          tokenHolderReward: reward.tokenHolderReward,
          tokenHolderRewardEns: reward.tokenHolderRewardEns,
          lotteryReward: reward.lotteryReward,
          lotteryRewardEns: reward.lotteryRewardEns,
          totalReward: reward.totalReward,
          totalRewardEns: reward.totalRewardEns,
        } satisfies AddressDistributionRound;
      })
      .sort((a, b) => b.roundNumber - a.roundNumber),
  };
}

export default createDistributionsApp();
