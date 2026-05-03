import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { distributionResult } from "ponder:schema";
import { POOL_TIERS } from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  findTierIndex,
  formatEns,
  normalizeAddress,
} from "../helpers.js";
import {
  getAddressReward,
  getDistributionSnapshot,
  getTopDelegateRewards,
  getTopTokenHolderRewards,
  parseDistributionRows,
  type DistributionStorageRow,
  type ParsedDistribution,
} from "../distribution-utils.js";
import {
  getConfiguredRoundMonths,
  getRoundDateRange,
  getRoundMonth,
  getRoundNumber,
  getRoundTiming,
  getUtcMonth,
  parseRoundMonths,
} from "../round-config.js";

const RoundStatusSchema = z.enum(["live", "ended", "pending", "paid"]);
const DistributionDataStatusSchema = z.enum(["available", "in_progress", "missing", "not_started"]);

const CurrentRoundResponse = z.object({
  roundNumber: z.number().openapi({ description: "Sequential round number from ROUND_MONTHS", example: 3 }),
  startDate: z.string().openapi({ description: "ISO 8601 UTC start of the round", example: "2026-05-01T00:00:00.000Z" }),
  endDate: z.string().openapi({ description: "ISO 8601 UTC end of the round", example: "2026-05-31T23:59:59.999Z" }),
  percentComplete: z.number().openapi({ description: "Percentage of round elapsed (0-100)", example: 10 }),
  daysRemaining: z.number().openapi({ example: 28 }),
  poolSizeEns: z.string().openapi({ description: "Current round tier pool size in ENS", example: "5000.000000000000000000" }),
  tierIndex: z.number().openapi({ example: 0 }),
  vpGrowthPct: z.string().openapi({ description: "Current month active VP growth percentage", example: "0.00" }),
});

const RoundSummarySchema = z.object({
  roundNumber: z.number(),
  month: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  status: RoundStatusSchema,
  distributionDataStatus: DistributionDataStatusSchema,
  isCurrent: z.boolean(),
  percentComplete: z.number().nullable(),
  daysRemaining: z.number().nullable(),
  tierIndex: z.number().nullable(),
  tierLabel: z.string().nullable(),
  vpGrowthPct: z.string().nullable(),
  poolSize: z.string().nullable(),
  poolSizeEns: z.string().nullable(),
  totalDistributed: z.string().nullable(),
  totalDistributedEns: z.string().nullable(),
  activeDelegateCount: z.number().nullable(),
  eligibleDelegatorCount: z.number().nullable(),
  computedAt: z.string().nullable(),
});

const RoundListResponse = z.object({
  currentRoundNumber: z.number().nullable(),
  rounds: z.array(RoundSummarySchema),
});

const RewardRankSchema = z.object({
  rank: z.number(),
  address: z.string(),
  ensName: z.string().nullable(),
  role: z.enum(["delegate", "token_holder"]),
  reward: z.string(),
  rewardEns: z.string(),
  source: z.enum(["direct", "lottery", "combined"]),
  votingPower: z.string().nullable(),
  delegationCount: z.number().nullable(),
});

const AddressRoundRewardSchema = z.object({
  address: z.string(),
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

const RoundDetailResponse = RoundSummarySchema.extend({
  addressReward: AddressRoundRewardSchema.nullable(),
  topDelegateRewards: z.array(RewardRankSchema),
  topTokenHolderRewards: z.array(RewardRankSchema),
});

const RoundNumberParam = z.object({
  roundNumber: z.coerce
    .number()
    .int()
    .positive()
    .openapi({ param: { name: "roundNumber", in: "path" }, example: 3 }),
});

const AddressQuery = z.object({
  address: z.string().optional().openapi({
    description: "Optional Ethereum address for wallet-specific round earnings",
    example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  }),
});

export interface RoundTierSnapshot {
  tierIndex: number;
  poolSizeEns: string;
  vpGrowthPct: string;
}

export interface RoundsRouteDeps {
  getRows?: () => Promise<DistributionStorageRow[]>;
  getTierSnapshot?: () => Promise<RoundTierSnapshot>;
  now?: () => Date;
}

async function getStoredDistributionRows(): Promise<DistributionStorageRow[]> {
  const rows = await db.select().from(distributionResult);
  return rows as DistributionStorageRow[];
}

async function getCurrentTierSnapshot(): Promise<RoundTierSnapshot> {
  const { activeDelegates } = await fetchActiveDelegates(db);
  const { growthPct } = await fetchCurrentVpGrowth(
    db,
    activeDelegates,
    activeDelegates,
  );
  const tierIndex = findTierIndex(growthPct);

  return {
    tierIndex,
    poolSizeEns: formatEns(POOL_TIERS[tierIndex].poolSize as bigint),
    vpGrowthPct: growthPct.toFixed(2),
  };
}

const currentRoute = createRoute({
  method: "get",
  path: "/rounds/current",
  tags: ["Rounds"],
  summary: "Current incentive round",
  description:
    "Returns current round dates, progress, pool size, and active tier index. Dates are UTC.",
  responses: {
    200: {
      description: "Current round info",
      content: { "application/json": { schema: CurrentRoundResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const listRoute = createRoute({
  method: "get",
  path: "/rounds",
  tags: ["Rounds"],
  summary: "List configured rounds with reward summaries",
  description:
    "Returns all configured ROUND_MONTHS rounds with UTC dates, global pool/distribution metadata when available, and truthful missing-data states.",
  responses: {
    200: {
      description: "Round summaries",
      content: { "application/json": { schema: RoundListResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const detailRoute = createRoute({
  method: "get",
  path: "/rounds/{roundNumber}",
  tags: ["Rounds"],
  summary: "Get round details",
  description:
    "Returns one round's global reward summary, optional address-specific reward, and top delegate/token-holder rewards when distribution data exists.",
  request: { params: RoundNumberParam, query: AddressQuery },
  responses: {
    200: {
      description: "Round detail",
      content: { "application/json": { schema: RoundDetailResponse } },
    },
    400: {
      description: "Invalid address",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Unknown round",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const roundDistributionsRoute = createRoute({
  method: "get",
  path: "/rounds/{roundNumber}/distributions",
  tags: ["Rounds"],
  summary: "Get round distribution rankings",
  description:
    "Returns top delegate and token-holder rewards for one round when stored distribution data exists.",
  request: { params: RoundNumberParam, query: AddressQuery },
  responses: {
    200: {
      description: "Round distribution detail",
      content: { "application/json": { schema: RoundDetailResponse } },
    },
    400: {
      description: "Invalid address",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    404: {
      description: "Unknown round",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

export function createRoundsApp(deps: RoundsRouteDeps = {}) {
  const app = new OpenAPIHono();
  const getRows = deps.getRows ?? getStoredDistributionRows;
  const getTierSnapshot = deps.getTierSnapshot ?? getCurrentTierSnapshot;
  const getNow = deps.now ?? (() => new Date());

  app.openapi(currentRoute, async (c) => {
    try {
      const now = getNow();
      const roundMonths = getConfiguredRoundMonths();
      const month = getUtcMonth(now);
      const roundNumber = getRoundNumber(month, roundMonths) ?? 1;
      const range = getRoundDateRange(month);
      const timing = getRoundTiming(month, now, false);
      const tier = await getTierSnapshot();

      return c.json(
        {
          roundNumber,
          startDate: range.startDate,
          endDate: range.endDate,
          percentComplete: timing.percentComplete ?? 0,
          daysRemaining: timing.daysRemaining ?? 0,
          poolSizeEns: tier.poolSizeEns,
          tierIndex: tier.tierIndex,
          vpGrowthPct: tier.vpGrowthPct,
        },
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(listRoute, async (c) => {
    try {
      const [rows, tierSnapshot] = await Promise.all([
        getRows(),
        getTierSnapshot(),
      ]);
      const roundMonths = getConfiguredRoundMonths();
      const currentRoundNumber = getRoundNumber(getUtcMonth(getNow()), roundMonths);
      const parsedRows = parseDistributionRows(rows);

      return c.json(
        {
          currentRoundNumber,
          rounds: buildRoundSummaries({
            roundMonths,
            parsedRows,
            now: getNow(),
            currentTierSnapshot: tierSnapshot,
          }),
        },
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  const handleRoundDetail = async (c: any) => {
    try {
      const { roundNumber } = c.req.valid("param");
      const { address: rawAddress } = c.req.valid("query");
      const address = rawAddress ? normalizeAddress(rawAddress) : null;

      if (rawAddress && !address) {
        return c.json({ error: "Invalid Ethereum address" }, 400);
      }

      const [rows, tierSnapshot] = await Promise.all([
        getRows(),
        getTierSnapshot(),
      ]);
      const roundMonths = getConfiguredRoundMonths();
      const month = getRoundMonth(roundNumber, roundMonths);

      if (!month) {
        return c.json({ error: `Unknown round ${roundNumber}` }, 404);
      }

      const parsedRows = parseDistributionRows(rows);
      const parsed = parsedRows.get(month) ?? null;
      const summary = buildRoundSummary({
        roundNumber,
        month,
        parsed,
        now: getNow(),
        currentTierSnapshot: tierSnapshot,
      });

      return c.json(
        {
          ...summary,
          addressReward: address
            ? buildAddressRoundReward(address, parsed, summary.distributionDataStatus)
            : null,
          topDelegateRewards: parsed ? getTopDelegateRewards(parsed) : [],
          topTokenHolderRewards: parsed ? getTopTokenHolderRewards(parsed) : [],
        },
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  };

  app.openapi(detailRoute, handleRoundDetail);
  app.openapi(roundDistributionsRoute, handleRoundDetail);

  return app;
}

function buildRoundSummaries({
  roundMonths,
  parsedRows,
  now,
  currentTierSnapshot,
}: {
  roundMonths: string[];
  parsedRows: ReadonlyMap<string, ParsedDistribution>;
  now: Date;
  currentTierSnapshot: RoundTierSnapshot;
}) {
  return roundMonths
    .map((month, index) => buildRoundSummary({
      roundNumber: index + 1,
      month,
      parsed: parsedRows.get(month) ?? null,
      now,
      currentTierSnapshot,
    }))
    .sort((a, b) => b.roundNumber - a.roundNumber);
}

function buildRoundSummary({
  roundNumber,
  month,
  parsed,
  now,
  currentTierSnapshot,
}: {
  roundNumber: number;
  month: string;
  parsed: ParsedDistribution | null;
  now: Date;
  currentTierSnapshot: RoundTierSnapshot;
}) {
  const range = getRoundDateRange(month);
  const timing = getRoundTiming(month, now, parsed != null);
  const snapshot = parsed ? getDistributionSnapshot(parsed) : null;
  const isCurrentWithoutDistribution = timing.isCurrent && !snapshot;
  const tierIndex = snapshot?.tierIndex ?? (
    isCurrentWithoutDistribution ? currentTierSnapshot.tierIndex : null
  );
  const poolSizeEns = snapshot?.poolSizeEns ?? (
    isCurrentWithoutDistribution ? currentTierSnapshot.poolSizeEns : null
  );
  const vpGrowthPct = snapshot?.vpGrowthPct ?? (
    isCurrentWithoutDistribution ? currentTierSnapshot.vpGrowthPct : null
  );
  const tierConfig = tierIndex == null ? null : POOL_TIERS[tierIndex];

  return {
    roundNumber,
    month,
    startDate: range.startDate,
    endDate: range.endDate,
    status: timing.status,
    distributionDataStatus: timing.distributionDataStatus,
    isCurrent: timing.isCurrent,
    percentComplete: timing.percentComplete,
    daysRemaining: timing.daysRemaining,
    tierIndex,
    tierLabel: tierIndex == null ? null : `Tier #${tierIndex + 1}`,
    vpGrowthPct,
    poolSize: snapshot?.poolSize ?? (
      isCurrentWithoutDistribution && tierConfig
        ? (tierConfig.poolSize as bigint).toString()
        : null
    ),
    poolSizeEns,
    totalDistributed: snapshot?.totalDistributed ?? null,
    totalDistributedEns: snapshot?.totalDistributedEns ?? null,
    activeDelegateCount: snapshot?.activeDelegateCount ?? null,
    eligibleDelegatorCount: snapshot?.eligibleDelegatorCount ?? null,
    computedAt: snapshot?.computedAt ?? null,
  };
}

function buildAddressRoundReward(
  address: string,
  parsed: ParsedDistribution | null,
  distributionDataStatus: string,
) {
  if (!parsed) {
    const rewardStatus = distributionDataStatus === "in_progress"
      ? "pending"
      : "unavailable";

    return {
      address,
      rewardStatus,
      delegateReward: "0",
      delegateRewardEns: "0.000000000000000000",
      tokenHolderReward: "0",
      tokenHolderRewardEns: "0.000000000000000000",
      lotteryReward: "0",
      lotteryRewardEns: "0.000000000000000000",
      totalReward: "0",
      totalRewardEns: "0.000000000000000000",
    };
  }

  const reward = getAddressReward(parsed, address);
  return {
    address: reward.address,
    rewardStatus: reward.status,
    delegateReward: reward.delegateReward,
    delegateRewardEns: reward.delegateRewardEns,
    tokenHolderReward: reward.tokenHolderReward,
    tokenHolderRewardEns: reward.tokenHolderRewardEns,
    lotteryReward: reward.lotteryReward,
    lotteryRewardEns: reward.lotteryRewardEns,
    totalReward: reward.totalReward,
    totalRewardEns: reward.totalRewardEns,
  };
}

export { parseRoundMonths };

export default createRoundsApp();
