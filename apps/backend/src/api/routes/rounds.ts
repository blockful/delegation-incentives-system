import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { ensVotingPowerSnapshot } from "ponder:schema";
import { and, desc, inArray, lte } from "drizzle-orm";
import { POOL_TIERS } from "@ens-dis/domain";
import { distributionResult, getAppDb } from "../../db/app-tables.js";
import {
  fetchActiveVoters,
  fetchCurrentVpGrowth,
  findTierIndex,
  formatEns,
  normalizeAddress,
} from "../helpers.js";
import {
  getAddressReward,
  getDistributionSnapshot,
  getLotteryDetail,
  getTopVoterRewards,
  getTopTokenHolderRewards,
  parseDistributionRows,
  type DistributionStorageRow,
  type ParsedDistribution,
  type RewardRank,
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

const RoundStatusSchema = z.enum(["live", "ended", "upcoming", "paid"]);
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
  activeVoterCount: z.number().nullable(),
  eligibleTokenHolderCount: z.number().nullable().openapi({
    description: "Computed round count of direct payout rows with a positive token-holder reward. Excludes sub-1 ENS lottery entries and lottery-only winners.",
    example: 312,
  }),
  lotteryBucketCount: z.number().nullable().openapi({
    description: "Number of deterministic lottery buckets formed from sub-1 ENS entries.",
    example: 53,
  }),
  lotteryEntryCount: z.number().nullable().openapi({
    description: "Number of sub-threshold reward entries participating in the lottery.",
    example: 2597,
  }),
  lotteryParticipantCount: z.number().nullable().openapi({
    description: "Unique address count across lottery entries.",
    example: 2597,
  }),
  lotteryWinnerCount: z.number().nullable().openapi({
    description: "Unique lottery winner count.",
    example: 53,
  }),
  lotteryPrize: z.string().nullable(),
  lotteryPrizeEns: z.string().nullable(),
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
  role: z.enum(["voter", "token_holder"]),
  reward: z.string(),
  rewardEns: z.string(),
  source: z.enum(["direct", "lottery", "combined"]),
  votingPower: z.string().nullable(),
  tokenHolderBalance: z.string().nullable().openapi({
    description:
      "Time-weighted ENS balance backing the token-holder reward (Wei). Null for voter rows and for historic rounds computed before this field was persisted.",
    example: "1500000000000000000000",
  }),
  delegationCount: z.number().nullable(),
});

const CapStatusSchema = z
  .enum(["not_affected", "received_redistribution", "reached_cap"])
  .openapi({
    description:
      "How cap redistribution affected the allocation: not_affected (final equals raw pro-rata), received_redistribution (received excess from capped wallets), reached_cap (clamped at the per-wallet cap).",
    example: "not_affected",
  });

const VoterProvenanceSchema = z.object({
  avgVotingPower: z.string().openapi({
    description: "Time-weighted average voting power (TWAP) over the round month, in Wei.",
    example: "1234560000000000000000",
  }),
  avgVotingPowerEns: z.string().openapi({
    description: "avgVotingPower formatted in ENS (18 decimals).",
    example: "1234.560000000000000000",
  }),
  poolSharePct: z.string().openapi({
    description: "Share of the voter pool, percent string with 2 decimals (style: vpGrowthPct).",
    example: "3.21",
  }),
  rawReward: z.string().openapi({
    description: "Pre-cap pro-rata allocation, in Wei.",
    example: "15100000000000000000",
  }),
  rawRewardEns: z.string().openapi({
    description: "rawReward formatted in ENS (18 decimals).",
    example: "15.100000000000000000",
  }),
  finalReward: z.string().openapi({
    description: "Post-cap allocation, in Wei. Equals voterReward.",
    example: "12400000000000000000",
  }),
  finalRewardEns: z.string().openapi({
    description: "finalReward formatted in ENS (18 decimals).",
    example: "12.400000000000000000",
  }),
  cap: z.string().openapi({
    description: "Resolved per-voter cap for the round (1% of the pool), in Wei.",
    example: "250000000000000000000",
  }),
  capEns: z.string().openapi({
    description: "cap formatted in ENS (18 decimals).",
    example: "250.000000000000000000",
  }),
  capStatus: CapStatusSchema,
  redistributionReceived: z.string().openapi({
    description: 'Excess received from capped wallets, in Wei. "0" unless capStatus is received_redistribution.',
    example: "0",
  }),
  redistributionReceivedEns: z.string().openapi({
    description: "redistributionReceived formatted in ENS (18 decimals).",
    example: "0.000000000000000000",
  }),
});

const TokenHolderProvenanceSchema = z.object({
  avgBalance: z.string().openapi({
    description: "Time-weighted ENS balance (TWB) over the trailing 180-day window, in Wei.",
    example: "1234560000000000000000",
  }),
  avgBalanceEns: z.string().openapi({
    description: "avgBalance formatted in ENS (18 decimals).",
    example: "1234.560000000000000000",
  }),
  poolSharePct: z.string().openapi({
    description: "Share of the token-holder pool, percent string with 2 decimals (style: vpGrowthPct).",
    example: "3.21",
  }),
  rawReward: z.string().openapi({
    description: "Pre-cap pro-rata allocation, in Wei.",
    example: "15100000000000000000",
  }),
  rawRewardEns: z.string().openapi({
    description: "rawReward formatted in ENS (18 decimals).",
    example: "15.100000000000000000",
  }),
  finalReward: z.string().openapi({
    description: "Post-cap allocation, in Wei. Equals tokenHolderReward.",
    example: "12400000000000000000",
  }),
  finalRewardEns: z.string().openapi({
    description: "finalReward formatted in ENS (18 decimals).",
    example: "12.400000000000000000",
  }),
  cap: z.string().openapi({
    description: "Resolved per-token-holder cap for the round (5% of the pool), in Wei.",
    example: "250000000000000000000",
  }),
  capEns: z.string().openapi({
    description: "cap formatted in ENS (18 decimals).",
    example: "250.000000000000000000",
  }),
  capStatus: CapStatusSchema,
  redistributionReceived: z.string().openapi({
    description: 'Excess received from capped wallets, in Wei. "0" unless capStatus is received_redistribution.',
    example: "0",
  }),
  redistributionReceivedEns: z.string().openapi({
    description: "redistributionReceived formatted in ENS (18 decimals).",
    example: "0.000000000000000000",
  }),
  sources: z
    .array(z.enum(["direct", "multidelegate", "hedgey"]))
    .nullable()
    .openapi({
      description:
        "Deduplicated holding kinds backing the consolidated balance. Null when the round's stored data does not track sources.",
      example: ["direct", "multidelegate", "hedgey"],
    }),
});

const RewardProvenanceSchema = z.object({
  voter: VoterProvenanceSchema.nullable().openapi({
    description: "Delegate (voter) reward provenance. Null when the wallet earned no voter reward.",
  }),
  tokenHolder: TokenHolderProvenanceSchema.nullable().openapi({
    description: "Token-holder reward provenance. Null when the wallet earned no token-holder reward.",
  }),
});

const AddressRoundRewardSchema = z.object({
  address: z.string(),
  rewardStatus: z.enum(["paid", "no_reward", "not_eligible", "pending", "unavailable"]),
  voterReward: z.string(),
  voterRewardEns: z.string(),
  tokenHolderReward: z.string(),
  tokenHolderRewardEns: z.string(),
  lotteryReward: z.string(),
  lotteryRewardEns: z.string(),
  totalReward: z.string(),
  totalRewardEns: z.string(),
  provenance: RewardProvenanceSchema.nullable().openapi({
    description:
      "Per-wallet allocation provenance (averages, pool share, pre-cap allocation, cap redistribution). Null for rounds whose persisted result predates provenance tracking (never recomputed) and for rewardStatus pending/unavailable/not_eligible. Lottery winnings carry no provenance — seed and odds live in the lottery payload.",
  }),
});

const LotteryEntrySchema = z.object({
  bucketIndex: z.number(),
  entryIndex: z.number(),
  address: z.string(),
  ensName: z.string().nullable(),
  amount: z.string(),
  amountEns: z.string(),
  probability: z.string().openapi({
    description: "Entry win probability inside the bucket, formatted as a 0-1 decimal string.",
    example: "0.1250",
  }),
});

const LotteryBucketSchema = z.object({
  bucketIndex: z.number(),
  prize: z.string(),
  prizeEns: z.string(),
  winner: z.string(),
  winnerEnsName: z.string().nullable(),
  winnerProbability: z.string().nullable(),
  entryCount: z.number(),
  entries: z.array(LotteryEntrySchema),
});

const LotteryDetailSchema = z.object({
  seed: z.object({
    source: z.literal("ethereum_prev_randao"),
    label: z.string(),
    value: z.string(),
    blockNumber: z.string(),
    algorithm: z.string(),
  }),
  bucketTarget: z.string(),
  bucketTargetEns: z.string(),
  totalPrize: z.string(),
  totalPrizeEns: z.string(),
  bucketCount: z.number(),
  entryCount: z.number(),
  participantCount: z.number(),
  winnerCount: z.number(),
  buckets: z.array(LotteryBucketSchema),
});

const RoundDetailResponse = RoundSummarySchema.extend({
  addressReward: AddressRoundRewardSchema.nullable(),
  topVoterRewards: z.array(RewardRankSchema),
  topTokenHolderRewards: z.array(RewardRankSchema),
  lottery: LotteryDetailSchema.nullable(),
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
  rewardLimit: z.string().optional().openapi({
    description: "Reward ranking rows to return on round detail. Defaults to 10. Use all to return every reward row.",
    example: "all",
  }),
});

const DEFAULT_REWARD_LIMIT = 10;
const MAX_REWARD_LIMIT = 1000;

export interface RoundTierSnapshot {
  tierIndex: number;
  poolSizeEns: string;
  vpGrowthPct: string;
}

export interface RoundsRouteDeps {
  getRows?: () => Promise<DistributionStorageRow[]>;
  getTierSnapshot?: () => Promise<RoundTierSnapshot>;
  getVotingPowers?: (
    addresses: readonly string[],
    asOfTimestamp: bigint,
  ) => Promise<Map<string, string>>;
  now?: () => Date;
}

async function getStoredDistributionRows(): Promise<DistributionStorageRow[]> {
  const { db: appDb, ready } = getAppDb();
  await ready;
  const rows = await appDb.select().from(distributionResult);
  return rows as DistributionStorageRow[];
}

async function getVotingPowersAt(
  addresses: readonly string[],
  asOfTimestamp: bigint,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (addresses.length === 0) return result;

  const lowered = Array.from(new Set(addresses.map((addr) => addr.toLowerCase())));
  const rows = await db
    .select({
      voterId: ensVotingPowerSnapshot.voterId,
      votingPower: ensVotingPowerSnapshot.votingPower,
      timestamp: ensVotingPowerSnapshot.timestamp,
    })
    .from(ensVotingPowerSnapshot)
    .where(
      and(
        inArray(ensVotingPowerSnapshot.voterId, lowered),
        lte(ensVotingPowerSnapshot.timestamp, asOfTimestamp),
      ),
    )
    .orderBy(desc(ensVotingPowerSnapshot.timestamp));

  for (const row of rows) {
    const voterId = row.voterId.toLowerCase();
    if (result.has(voterId)) continue;
    result.set(voterId, BigInt(row.votingPower).toString());
  }
  return result;
}

async function getCurrentTierSnapshot(): Promise<RoundTierSnapshot> {
  const { activeVoters } = await fetchActiveVoters(db);
  const { growthPct } = await fetchCurrentVpGrowth(
    db,
    activeVoters,
    activeVoters,
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
  const getVotingPowers = deps.getVotingPowers ?? getVotingPowersAt;
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
      // Don't echo internals to clients — the real error goes to the
      // function logs, which are the only place to look once this is generic.
      console.error("rounds API error:", err);
      return c.json({ error: "Internal server error" }, 500);
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
      // Don't echo internals to clients — the real error goes to the
      // function logs, which are the only place to look once this is generic.
      console.error("rounds API error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  });

  const handleRoundDetail = async (c: any) => {
    try {
      const { roundNumber } = c.req.valid("param");
      const { address: rawAddress, rewardLimit: rawRewardLimit } = c.req.valid("query");
      const address = rawAddress ? normalizeAddress(rawAddress) : null;

      if (rawAddress && !address) {
        return c.json({ error: "Invalid Ethereum address" }, 400);
      }

      const rewardLimit = parseRewardLimit(rawRewardLimit);
      if (rewardLimit == null) {
        return c.json({ error: "Invalid rewardLimit" }, 400);
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

      const topVoterRewards = parsed ? getTopVoterRewards(parsed, rewardLimit) : [];
      const topTokenHolderRewards = parsed
        ? getTopTokenHolderRewards(parsed, rewardLimit)
        : [];
      const voterAddresses = topVoterRewards.map((row) =>
        row.address.toLowerCase(),
      );
      const votingPowers = parsed && voterAddresses.length > 0
        ? await getVotingPowers(
            voterAddresses,
            parsed.result.metadata.monthEnd as bigint,
          )
        : new Map<string, string>();

      return c.json(
        {
          ...summary,
          addressReward: address
            ? buildAddressRoundReward(address, parsed, summary.distributionDataStatus)
            : null,
          topVoterRewards: enrichWithVotingPower(topVoterRewards, votingPowers),
          topTokenHolderRewards,
          lottery: parsed ? getLotteryDetail(parsed) : null,
        },
        200,
      );
    } catch (err) {
      // Don't echo internals to clients — the real error goes to the
      // function logs, which are the only place to look once this is generic.
      console.error("rounds API error:", err);
      return c.json({ error: "Internal server error" }, 500);
    }
  };

  app.openapi(detailRoute, handleRoundDetail);
  app.openapi(roundDistributionsRoute, handleRoundDetail);

  return app;
}

function enrichWithVotingPower(
  rows: RewardRank[],
  votingPowers: ReadonlyMap<string, string>,
): RewardRank[] {
  if (votingPowers.size === 0) return rows;
  return rows.map((row) => {
    const vp = votingPowers.get(row.address.toLowerCase());
    return vp ? { ...row, votingPower: vp } : row;
  });
}

function parseRewardLimit(rawRewardLimit: string | undefined): number | null {
  if (!rawRewardLimit) return DEFAULT_REWARD_LIMIT;
  if (rawRewardLimit === "all") return Number.POSITIVE_INFINITY;

  const rewardLimit = Number(rawRewardLimit);
  if (!Number.isInteger(rewardLimit) || rewardLimit < 1 || rewardLimit > MAX_REWARD_LIMIT) {
    return null;
  }

  return rewardLimit;
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
    activeVoterCount: snapshot?.activeVoterCount ?? null,
    eligibleTokenHolderCount: snapshot?.eligibleTokenHolderCount ?? null,
    lotteryBucketCount: snapshot?.lotteryBucketCount ?? null,
    lotteryEntryCount: snapshot?.lotteryEntryCount ?? null,
    lotteryParticipantCount: snapshot?.lotteryParticipantCount ?? null,
    lotteryWinnerCount: snapshot?.lotteryWinnerCount ?? null,
    lotteryPrize: snapshot?.lotteryPrize ?? null,
    lotteryPrizeEns: snapshot?.lotteryPrizeEns ?? null,
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
      voterReward: "0",
      voterRewardEns: "0.000000000000000000",
      tokenHolderReward: "0",
      tokenHolderRewardEns: "0.000000000000000000",
      lotteryReward: "0",
      lotteryRewardEns: "0.000000000000000000",
      totalReward: "0",
      totalRewardEns: "0.000000000000000000",
      provenance: null,
    };
  }

  const reward = getAddressReward(parsed, address);
  return {
    address: reward.address,
    rewardStatus: reward.status,
    voterReward: reward.voterReward,
    voterRewardEns: reward.voterRewardEns,
    tokenHolderReward: reward.tokenHolderReward,
    tokenHolderRewardEns: reward.tokenHolderRewardEns,
    lotteryReward: reward.lotteryReward,
    lotteryRewardEns: reward.lotteryRewardEns,
    totalReward: reward.totalReward,
    totalRewardEns: reward.totalRewardEns,
    provenance: reward.provenance,
  };
}

export { parseRoundMonths };

export default createRoundsApp();
