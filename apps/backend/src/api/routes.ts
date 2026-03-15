import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import type { IncentivesDataSource } from "@/data/interfaces.js";
import { runDistributionPipeline } from "@/pipeline/distribution-pipeline.js";
import { distributionToCsv } from "@/output/csv-writer.js";
import { distributionToJson } from "@/output/json-writer.js";
import { identifyActiveDelegates } from "@/domain/active-delegates.js";
import { determinePoolTier } from "@/domain/pool-sizing.js";
import { computeTimeWeightedBalance } from "@/domain/time-weighted-balance.js";
import {
  PROPOSAL_WINDOW_SIZE,
  ONE_ENS,
  TWB_WINDOW_SECONDS,
  type DistributionResult,
} from "@/domain/types.js";
import { seconds, wei } from "@/domain/types.js";
import {
  POOL_TIERS,
  DELEGATE_POOL_BPS,
  DELEGATOR_POOL_BPS,
} from "@/config.js";
import { percentageGrowthBps, applyBasisPoints, mulDiv } from "@/util/bigint-math.js";
import {
  parseMonth,
  monthEndTimestamp,
  previousMonth,
  currentMonth,
} from "@/util/time.js";

// ─── Shared helpers ─────────────────────────────────────────────────────────

/** Fetch proposals/votes and identify active delegates. Reused across routes. */
async function fetchActiveDelegates(dataSource: IncentivesDataSource) {
  const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
  const proposalIds = proposals.map((p) => p.id);
  const votes = await dataSource.votes.getVotesForProposals(proposalIds);
  const activeDelegates = identifyActiveDelegates(proposals, votes);
  return { proposals, votes, activeDelegates };
}

/** Case-insensitive set from a Set<string>. */
function toLowerSet(addresses: Set<string>): Set<string> {
  return new Set(Array.from(addresses).map((a) => a.toLowerCase()));
}

/** Resolve current and previous month boundaries + aggregate VP + tier. */
async function fetchMonthContext(
  dataSource: IncentivesDataSource,
  activeDelegateArray: string[],
) {
  const monthStr = currentMonth();
  const { year, month } = parseMonth(monthStr);
  const monthEnd = monthEndTimestamp(year, month);
  const prevMonthStr = previousMonth(monthStr);
  const { year: prevYear, month: prevMonth } = parseMonth(prevMonthStr);
  const prevMonthEnd = monthEndTimestamp(prevYear, prevMonth);

  const [currentAVP, previousAVP] = activeDelegateArray.length > 0
    ? await Promise.all([
        dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, monthEnd),
        dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, prevMonthEnd),
      ])
    : [wei(0n), wei(0n)];

  const poolTier = determinePoolTier(currentAVP, previousAVP, POOL_TIERS);
  const currentTierIndex = POOL_TIERS.indexOf(poolTier);

  return { monthEnd, currentAVP, previousAVP, poolTier, currentTierIndex };
}

/** Convert a Wei reward and Wei balance to an APY percentage string. */
function computeApyPct(monthlyReward: bigint, balance: bigint): string {
  const rewardEns = Number(monthlyReward) / Number(ONE_ENS);
  const balanceEns = Number(balance) / Number(ONE_ENS);
  const apyPct = balanceEns > 0 ? (rewardEns * 12 / balanceEns) * 100 : 0;
  return apyPct.toFixed(2);
}

/** Format Wei as ENS string (4 decimal places). */
function formatEns(value: bigint): string {
  return (Number(value) / Number(ONE_ENS)).toFixed(4);
}

/** Format Wei as whole ENS string (for pool sizes/caps). */
function formatWholeEns(value: bigint): string {
  return `${value / BigInt(ONE_ENS)}`;
}

/** Extract error message from unknown catch value. */
function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error";
}

// ─── Zod Schemas for OpenAPI ────────────────────────────────────────────────

const ErrorSchema = z
  .object({ error: z.string() })
  .openapi("Error");

const HealthSchema = z
  .object({ status: z.enum(["ok"]) })
  .openapi("Health");

const MonthParam = z.string().regex(/^\d{4}-\d{2}$/).openapi({
  param: { name: "month", in: "path" },
  example: "2025-03",
  description: "Target month in YYYY-MM format",
});

const AddressParam = z.string().openapi({
  param: { name: "address", in: "path" },
  example: "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  description: "Ethereum address",
});

const ComputeResultSchema = z
  .object({
    month: z.string(),
    totalDistributed: z.string(),
    activeDelegateCount: z.number(),
    eligibleDelegatorCount: z.number(),
    directPayoutCount: z.number(),
    lotteryPoolCount: z.number(),
  })
  .openapi("ComputeResult");

const ActiveDelegatesSchema = z
  .object({
    count: z.number(),
    delegates: z.array(z.string()),
  })
  .openapi("ActiveDelegates");

const EligibilitySchema = z
  .object({
    address: z.string(),
    isActiveDelegate: z.boolean(),
    isDelegatorToActiveDelegate: z.boolean(),
    eligible: z.boolean(),
    delegatedTo: z.string().nullable(),
  })
  .openapi("Eligibility");

const StatusSchema = z
  .object({
    activeDelegateCount: z.number(),
    proposalCount: z.number(),
    cachedDistributions: z.array(z.string()),
  })
  .openapi("Status");

const PayoutSchema = z.object({
  address: z.string(),
  amount: z.string(),
  amountEns: z.string(),
  role: z.enum(["delegate", "delegator"]),
});

const LotteryEntrySchema = z.object({
  address: z.string(),
  originalAmount: z.string(),
  role: z.enum(["delegate", "delegator"]),
});

const LotteryPoolSchema = z.object({
  totalPrize: z.string(),
  totalPrizeEns: z.string(),
  winner: z.string(),
  entries: z.array(LotteryEntrySchema),
});

const TierSchema = z.object({
  momGrowthMinBps: z.string(),
  momGrowthMaxBps: z.string(),
  poolSize: z.string(),
  delegateCap: z.string(),
  delegatorCap: z.string(),
});

const MetadataSchema = z.object({
  totalDistributed: z.string(),
  totalDistributedEns: z.string(),
  poolTier: TierSchema,
  momGrowthBps: z.string(),
  activeDelegateCount: z.number(),
  eligibleDelegatorCount: z.number(),
  computedAt: z.string(),
  randaoSeed: z.string(),
});

const DistributionSchema = z
  .object({
    month: z.string(),
    metadata: MetadataSchema,
    directPayouts: z.array(PayoutSchema),
    lotteryPools: z.array(LotteryPoolSchema),
  })
  .openapi("Distribution");

const TierProgressionEntrySchema = z.object({
  index: z.number(),
  momGrowthMinPct: z.string(),
  momGrowthMaxPct: z.string(),
  poolSizeEns: z.string(),
  delegateCapEns: z.string(),
  delegatorCapEns: z.string(),
  isCurrent: z.boolean(),
  isUnlocked: z.boolean(),
  additionalVPNeeded: z.string(),
  requiredAVP: z.string(),
});

const TierProgressionSchema = z
  .object({
    currentAVP: z.string(),
    previousAVP: z.string(),
    currentGrowthBps: z.string(),
    currentGrowthPct: z.string(),
    currentTierIndex: z.number(),
    activeDelegateCount: z.number(),
    tiers: z.array(TierProgressionEntrySchema),
  })
  .openapi("TierProgression");

const ApyEstimateSchema = z
  .object({
    address: z.string(),
    role: z.enum(["delegate", "delegator", "ineligible"]),
    delegatedTo: z.string().nullable(),
    currentTierIndex: z.number(),
    poolSizeEns: z.string(),
    estimatedMonthlyRewardEns: z.string(),
    estimatedApyPct: z.string(),
    userWeight: z.string(),
    totalPoolWeight: z.string(),
    currentBalanceEns: z.string(),
  })
  .openapi("ApyEstimate");

// ─── Route definitions ─────────────────────────────────────────────────────

const healthRoute = createRoute({
  method: "get", path: "/health", tags: ["System"], summary: "Health check",
  responses: { 200: { content: { "application/json": { schema: HealthSchema } }, description: "OK" } },
});

const computeRoute = createRoute({
  method: "post", path: "/distributions/{month}/compute", tags: ["Distributions"],
  summary: "Trigger distribution computation for a month",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "application/json": { schema: ComputeResultSchema } }, description: "Computation result" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid month format" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Computation error" },
  },
});

const getDistributionRoute = createRoute({
  method: "get", path: "/distributions/{month}", tags: ["Distributions"],
  summary: "Get computed distribution result (JSON)",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "application/json": { schema: DistributionSchema } }, description: "Distribution data" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not computed yet" },
  },
});

const getCsvRoute = createRoute({
  method: "get", path: "/distributions/{month}/csv", tags: ["Distributions"],
  summary: "Download distribution as CSV",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "text/csv": { schema: z.string() } }, description: "CSV file" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not computed yet" },
  },
});

const activeDelegatesRoute = createRoute({
  method: "get", path: "/delegates/active", tags: ["Delegates"],
  summary: "List current active delegates",
  responses: {
    200: { content: { "application/json": { schema: ActiveDelegatesSchema } }, description: "Active delegates" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const eligibilityRoute = createRoute({
  method: "get", path: "/eligibility/{address}", tags: ["Eligibility"],
  summary: "Check reward eligibility for an address",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: { content: { "application/json": { schema: EligibilitySchema } }, description: "Eligibility status" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const statusRoute = createRoute({
  method: "get", path: "/status", tags: ["System"], summary: "Get system status",
  responses: {
    200: { content: { "application/json": { schema: StatusSchema } }, description: "System status" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const tierProgressionRoute = createRoute({
  method: "get", path: "/tiers/progression", tags: ["Tiers"],
  summary: "Get current tier and VP needed for each higher tier",
  responses: {
    200: { content: { "application/json": { schema: TierProgressionSchema } }, description: "Tier progression" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const apyRoute = createRoute({
  method: "get", path: "/apy/{address}", tags: ["APY"],
  summary: "Get estimated APY for an address based on current conditions",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: { content: { "application/json": { schema: ApyEstimateSchema } }, description: "APY estimate" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

// ─── App factory ────────────────────────────────────────────────────────────

export interface ApiDeps {
  dataSource: IncentivesDataSource;
}

export function createApi(deps: ApiDeps): OpenAPIHono {
  const app = new OpenAPIHono();
  const { dataSource } = deps;
  const distributionCache = new Map<string, DistributionResult>();

  app.openapi(healthRoute, (c) => c.json({ status: "ok" as const }, 200));

  app.openapi(computeRoute, async (c) => {
    const { month } = c.req.valid("param");
    try {
      const result = await runDistributionPipeline({ month, dataSource });
      distributionCache.set(month, result);
      return c.json({
        month: result.month,
        totalDistributed: result.metadata.totalDistributed.toString(),
        activeDelegateCount: result.metadata.activeDelegateCount,
        eligibleDelegatorCount: result.metadata.eligibleDelegatorCount,
        directPayoutCount: result.directPayouts.length,
        lotteryPoolCount: result.lotteryPools.length,
      }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.openapi(getDistributionRoute, async (c) => {
    const { month } = c.req.valid("param");
    const result = distributionCache.get(month);
    if (!result) {
      return c.json({ error: "Distribution not computed yet. POST to /distributions/:month/compute first" }, 404);
    }
    return c.json(JSON.parse(distributionToJson(result)), 200);
  });

  app.openapi(getCsvRoute, async (c) => {
    const { month } = c.req.valid("param");
    const result = distributionCache.get(month);
    if (!result) {
      return c.json({ error: "Distribution not computed yet" }, 404);
    }
    return c.text(distributionToCsv(result), 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="distribution-${month}.csv"`,
    });
  });

  app.openapi(activeDelegatesRoute, async (c) => {
    try {
      const { activeDelegates } = await fetchActiveDelegates(dataSource);
      return c.json({ count: activeDelegates.size, delegates: Array.from(activeDelegates) }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.openapi(eligibilityRoute, async (c) => {
    const { address } = c.req.valid("param");
    try {
      const { activeDelegates } = await fetchActiveDelegates(dataSource);
      const activeLower = toLowerSet(activeDelegates);
      const isActiveDelegate = activeLower.has(address.toLowerCase());

      const accountBalances = await dataSource.delegations.getAccountBalances();
      const accountBalance = accountBalances.find(
        (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
      );
      const isDelegatorToActive =
        accountBalance !== undefined &&
        activeLower.has(accountBalance.delegate.toLowerCase());

      return c.json({
        address,
        isActiveDelegate,
        isDelegatorToActiveDelegate: isDelegatorToActive,
        eligible: isActiveDelegate || isDelegatorToActive,
        delegatedTo: accountBalance?.delegate ?? null,
      }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.openapi(statusRoute, async (c) => {
    try {
      const { proposals, activeDelegates } = await fetchActiveDelegates(dataSource);
      return c.json({
        activeDelegateCount: activeDelegates.size,
        proposalCount: proposals.length,
        cachedDistributions: Array.from(distributionCache.keys()),
      }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.openapi(tierProgressionRoute, async (c) => {
    try {
      const { activeDelegates } = await fetchActiveDelegates(dataSource);
      const activeDelegateArray = Array.from(activeDelegates);
      const { currentAVP, previousAVP, currentTierIndex } =
        await fetchMonthContext(dataSource, activeDelegateArray);

      const growthBps = percentageGrowthBps(currentAVP, previousAVP);

      const tiers = POOL_TIERS.map((tier, index) => {
        const requiredAVP = previousAVP === 0n
          ? 0n
          : previousAVP + mulDiv(previousAVP, tier.momGrowthMinBps, 10000n);
        const additionalVPNeeded = requiredAVP > currentAVP
          ? requiredAVP - currentAVP
          : 0n;

        return {
          index,
          momGrowthMinPct: `${Number(tier.momGrowthMinBps) / 100}`,
          momGrowthMaxPct: `${Number(tier.momGrowthMaxBps) / 100}`,
          poolSizeEns: formatWholeEns(tier.poolSize),
          delegateCapEns: formatWholeEns(tier.delegateCap),
          delegatorCapEns: formatWholeEns(tier.delegatorCap),
          isCurrent: index === currentTierIndex,
          isUnlocked: growthBps >= tier.momGrowthMinBps,
          additionalVPNeeded: additionalVPNeeded.toString(),
          requiredAVP: requiredAVP.toString(),
        };
      });

      return c.json({
        currentAVP: currentAVP.toString(),
        previousAVP: previousAVP.toString(),
        currentGrowthBps: growthBps.toString(),
        currentGrowthPct: `${Number(growthBps) / 100}`,
        currentTierIndex,
        activeDelegateCount: activeDelegates.size,
        tiers,
      }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.openapi(apyRoute, async (c) => {
    const { address } = c.req.valid("param");
    try {
      const { activeDelegates } = await fetchActiveDelegates(dataSource);
      const activeLower = toLowerSet(activeDelegates);
      const activeDelegateArray = Array.from(activeDelegates);
      const { monthEnd, poolTier, currentTierIndex } =
        await fetchMonthContext(dataSource, activeDelegateArray);

      const monthlyPool = poolTier.poolSize;
      const isActiveDelegate = activeLower.has(address.toLowerCase());
      const accountBalances = await dataSource.delegations.getAccountBalances();
      const accountBalance = accountBalances.find(
        (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
      );
      const isDelegatorToActive =
        accountBalance !== undefined &&
        activeLower.has(accountBalance.delegate.toLowerCase());

      if (!isActiveDelegate && !isDelegatorToActive) {
        return c.json({
          address,
          role: "ineligible" as const,
          delegatedTo: accountBalance?.delegate ?? null,
          currentTierIndex,
          poolSizeEns: formatWholeEns(monthlyPool),
          estimatedMonthlyRewardEns: "0",
          estimatedApyPct: "0",
          userWeight: "0",
          totalPoolWeight: "0",
          currentBalanceEns: "0",
        }, 200);
      }

      const twbWindowStart = seconds(monthEnd - TWB_WINDOW_SECONDS);

      if (isActiveDelegate) {
        const vpMap = await dataSource.votingPower.getVotingPower(activeDelegateArray);
        const userVP = vpMap.get(address) ?? vpMap.get(address.toLowerCase()) ?? wei(0n);
        let totalVP = 0n;
        for (const vp of vpMap.values()) totalVP += vp;

        const delegatePool = applyBasisPoints(monthlyPool, DELEGATE_POOL_BPS);
        const estimatedReward = totalVP > 0n ? mulDiv(userVP, delegatePool, totalVP) : 0n;
        const cappedReward = estimatedReward > poolTier.delegateCap
          ? poolTier.delegateCap : estimatedReward;

        return c.json({
          address,
          role: "delegate" as const,
          delegatedTo: null,
          currentTierIndex,
          poolSizeEns: formatWholeEns(monthlyPool),
          estimatedMonthlyRewardEns: formatEns(cappedReward),
          estimatedApyPct: computeApyPct(cappedReward, userVP),
          userWeight: userVP.toString(),
          totalPoolWeight: totalVP.toString(),
          currentBalanceEns: formatEns(userVP),
        }, 200);
      }

      // Delegator APY
      const balanceEvents = await dataSource.balances.getBalanceHistory([address], twbWindowStart, monthEnd);
      const initialBalance = await dataSource.balances.getBalanceAt(address, twbWindowStart);
      const userTWB = computeTimeWeightedBalance(balanceEvents, twbWindowStart, monthEnd, initialBalance);
      const currentBalance = await dataSource.balances.getBalanceAt(address, monthEnd);

      const delegations = await dataSource.delegations.getActiveDelegations(activeDelegateArray, monthEnd);
      const allDelegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];

      let totalTWB = 0n;
      for (const delegatorId of allDelegatorIds) {
        const events = await dataSource.balances.getBalanceHistory([delegatorId], twbWindowStart, monthEnd);
        const initBal = await dataSource.balances.getBalanceAt(delegatorId, twbWindowStart);
        totalTWB += computeTimeWeightedBalance(events, twbWindowStart, monthEnd, initBal);
      }

      const delegatorPool = applyBasisPoints(monthlyPool, DELEGATOR_POOL_BPS);
      const estimatedReward = totalTWB > 0n ? mulDiv(userTWB, delegatorPool, totalTWB) : 0n;
      const cappedReward = estimatedReward > poolTier.delegatorCap
        ? poolTier.delegatorCap : estimatedReward;

      return c.json({
        address,
        role: "delegator" as const,
        delegatedTo: accountBalance?.delegate ?? null,
        currentTierIndex,
        poolSizeEns: formatWholeEns(monthlyPool),
        estimatedMonthlyRewardEns: formatEns(cappedReward),
        estimatedApyPct: computeApyPct(cappedReward, currentBalance),
        userWeight: userTWB.toString(),
        totalPoolWeight: totalTWB.toString(),
        currentBalanceEns: formatEns(currentBalance),
      }, 200);
    } catch (error) {
      return c.json({ error: errorMessage(error) }, 500);
    }
  });

  app.doc("/docs/json", {
    openapi: "3.1.0",
    info: {
      title: "ENS Delegation Incentives API",
      version: "1.0.0",
      description:
        "API for computing and querying ENS delegation incentive distributions. " +
        "Handles active delegate identification, pool sizing, reward calculation with " +
        "cap redistribution, and lottery allocation.",
    },
    tags: [
      { name: "System", description: "Health and status endpoints" },
      { name: "Distributions", description: "Distribution computation and retrieval" },
      { name: "Delegates", description: "Delegate information" },
      { name: "Eligibility", description: "Reward eligibility checking" },
      { name: "Tiers", description: "Pool tier progression and VP requirements" },
      { name: "APY", description: "Estimated APY for addresses" },
    ],
  });

  app.get("/docs", swaggerUI({ url: "/docs/json" }));

  return app;
}
