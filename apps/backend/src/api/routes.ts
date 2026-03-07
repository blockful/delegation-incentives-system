import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
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
} from "@/util/time.js";

// --- Zod Schemas for OpenAPI ---

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

// --- Route definitions ---

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: { content: { "application/json": { schema: HealthSchema } }, description: "OK" },
  },
});

const computeRoute = createRoute({
  method: "post",
  path: "/distributions/{month}/compute",
  tags: ["Distributions"],
  summary: "Trigger distribution computation for a month",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "application/json": { schema: ComputeResultSchema } }, description: "Computation result" },
    400: { content: { "application/json": { schema: ErrorSchema } }, description: "Invalid month format" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Computation error" },
  },
});

const getDistributionRoute = createRoute({
  method: "get",
  path: "/distributions/{month}",
  tags: ["Distributions"],
  summary: "Get computed distribution result (JSON)",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "application/json": { schema: DistributionSchema } }, description: "Distribution data" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not computed yet" },
  },
});

const getCsvRoute = createRoute({
  method: "get",
  path: "/distributions/{month}/csv",
  tags: ["Distributions"],
  summary: "Download distribution as CSV",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: { content: { "text/csv": { schema: z.string() } }, description: "CSV file" },
    404: { content: { "application/json": { schema: ErrorSchema } }, description: "Not computed yet" },
  },
});

const activeDelegatesRoute = createRoute({
  method: "get",
  path: "/delegates/active",
  tags: ["Delegates"],
  summary: "List current active delegates",
  responses: {
    200: { content: { "application/json": { schema: ActiveDelegatesSchema } }, description: "Active delegates" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const eligibilityRoute = createRoute({
  method: "get",
  path: "/eligibility/{address}",
  tags: ["Eligibility"],
  summary: "Check reward eligibility for an address",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: { content: { "application/json": { schema: EligibilitySchema } }, description: "Eligibility status" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const statusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["System"],
  summary: "Get system status",
  responses: {
    200: { content: { "application/json": { schema: StatusSchema } }, description: "System status" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

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

const tierProgressionRoute = createRoute({
  method: "get",
  path: "/tiers/progression",
  tags: ["Tiers"],
  summary: "Get current tier and VP needed for each higher tier",
  responses: {
    200: { content: { "application/json": { schema: TierProgressionSchema } }, description: "Tier progression" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

const apyRoute = createRoute({
  method: "get",
  path: "/apy/{address}",
  tags: ["APY"],
  summary: "Get estimated APY for an address based on current conditions",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: { content: { "application/json": { schema: ApyEstimateSchema } }, description: "APY estimate" },
    500: { content: { "application/json": { schema: ErrorSchema } }, description: "Error" },
  },
});

// --- App factory ---

export interface ApiDeps {
  dataSource: IncentivesDataSource;
}

export function createApi(deps: ApiDeps): OpenAPIHono {
  const app = new OpenAPIHono();
  const { dataSource } = deps;

  const distributionCache = new Map<string, DistributionResult>();

  app.openapi(healthRoute, (c) => {
    return c.json({ status: "ok" as const }, 200);
  });

  app.openapi(computeRoute, async (c) => {
    const { month } = c.req.valid("param");

    try {
      const result = await runDistributionPipeline({ month, dataSource });
      distributionCache.set(month, result);
      return c.json(
        {
          month: result.month,
          totalDistributed: result.metadata.totalDistributed.toString(),
          activeDelegateCount: result.metadata.activeDelegateCount,
          eligibleDelegatorCount: result.metadata.eligibleDelegatorCount,
          directPayoutCount: result.directPayouts.length,
          lotteryPoolCount: result.lotteryPools.length,
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(getDistributionRoute, async (c) => {
    const { month } = c.req.valid("param");
    const result = distributionCache.get(month);
    if (!result) {
      return c.json(
        { error: "Distribution not computed yet. POST to /distributions/:month/compute first" },
        404,
      );
    }
    const body = JSON.parse(distributionToJson(result));
    return c.json(body, 200);
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
      const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
      const proposalIds = proposals.map((p) => p.id);
      const votes = await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      return c.json(
        { count: activeDelegates.size, delegates: Array.from(activeDelegates) },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(eligibilityRoute, async (c) => {
    const { address } = c.req.valid("param");
    try {
      const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
      const proposalIds = proposals.map((p) => p.id);
      const votes = await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      const activeDelegatesLower = new Set(
        Array.from(activeDelegates).map((d) => d.toLowerCase()),
      );
      const isActiveDelegate = activeDelegatesLower.has(address.toLowerCase());

      const accountBalances = await dataSource.delegations.getAccountBalances();
      const accountBalance = accountBalances.find(
        (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
      );
      const isDelegatorToActive =
        accountBalance !== undefined &&
        activeDelegatesLower.has(accountBalance.delegate.toLowerCase());

      return c.json(
        {
          address,
          isActiveDelegate,
          isDelegatorToActiveDelegate: isDelegatorToActive,
          eligible: isActiveDelegate || isDelegatorToActive,
          delegatedTo: accountBalance?.delegate ?? null,
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(statusRoute, async (c) => {
    try {
      const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
      const proposalIds = proposals.map((p) => p.id);
      const votes = await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      return c.json(
        {
          activeDelegateCount: activeDelegates.size,
          proposalCount: proposals.length,
          cachedDistributions: Array.from(distributionCache.keys()),
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(tierProgressionRoute, async (c) => {
    try {
      // Get active delegates
      const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
      const proposalIds = proposals.map((p) => p.id);
      const votes = await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      const activeDelegateArray = Array.from(activeDelegates);

      // Get current month boundaries
      const now = new Date();
      const currentMonthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const { year, month } = parseMonth(currentMonthStr);
      const monthEnd = monthEndTimestamp(year, month);
      const prevMonthStr = previousMonth(currentMonthStr);
      const { year: prevYear, month: prevMonth } = parseMonth(prevMonthStr);
      const prevMonthEnd = monthEndTimestamp(prevYear, prevMonth);

      // Get aggregate VP
      const currentAVP = activeDelegateArray.length > 0
        ? await dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, monthEnd)
        : wei(0n);
      const previousAVP = activeDelegateArray.length > 0
        ? await dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, prevMonthEnd)
        : wei(0n);

      const growthBps = percentageGrowthBps(currentAVP as bigint, previousAVP as bigint);
      const currentTier = determinePoolTier(currentAVP, previousAVP, POOL_TIERS);
      const currentTierIndex = POOL_TIERS.indexOf(currentTier);

      const tiers = POOL_TIERS.map((tier, index) => {
        // VP needed to reach this tier's minimum growth
        const requiredAVP = (previousAVP as bigint) === 0n
          ? 0n
          : (previousAVP as bigint) + mulDiv(previousAVP as bigint, tier.momGrowthMinBps as bigint, 10000n);
        const additionalVPNeeded = requiredAVP > (currentAVP as bigint)
          ? requiredAVP - (currentAVP as bigint)
          : 0n;

        return {
          index,
          momGrowthMinPct: `${Number(tier.momGrowthMinBps) / 100}`,
          momGrowthMaxPct: `${Number(tier.momGrowthMaxBps) / 100}`,
          poolSizeEns: `${(tier.poolSize as bigint) / (ONE_ENS as bigint)}`,
          delegateCapEns: `${(tier.delegateCap as bigint) / (ONE_ENS as bigint)}`,
          delegatorCapEns: `${(tier.delegatorCap as bigint) / (ONE_ENS as bigint)}`,
          isCurrent: index === currentTierIndex,
          isUnlocked: growthBps >= (tier.momGrowthMinBps as bigint),
          additionalVPNeeded: additionalVPNeeded.toString(),
          requiredAVP: requiredAVP.toString(),
        };
      });

      return c.json(
        {
          currentAVP: (currentAVP as bigint).toString(),
          previousAVP: (previousAVP as bigint).toString(),
          currentGrowthBps: growthBps.toString(),
          currentGrowthPct: `${Number(growthBps) / 100}`,
          currentTierIndex,
          activeDelegateCount: activeDelegates.size,
          tiers,
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  app.openapi(apyRoute, async (c) => {
    const { address } = c.req.valid("param");
    try {
      // Identify active delegates
      const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE);
      const proposalIds = proposals.map((p) => p.id);
      const votes = await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      const activeDelegatesLower = new Set(
        Array.from(activeDelegates).map((d) => d.toLowerCase()),
      );
      const activeDelegateArray = Array.from(activeDelegates);

      // Determine current tier
      const now = new Date();
      const currentMonthStr = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
      const { year, month } = parseMonth(currentMonthStr);
      const monthEnd = monthEndTimestamp(year, month);
      const prevMonthStr = previousMonth(currentMonthStr);
      const { year: prevYear, month: prevMonth } = parseMonth(prevMonthStr);
      const prevMonthEnd = monthEndTimestamp(prevYear, prevMonth);

      const currentAVP = activeDelegateArray.length > 0
        ? await dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, monthEnd)
        : wei(0n);
      const previousAVP = activeDelegateArray.length > 0
        ? await dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, prevMonthEnd)
        : wei(0n);

      const poolTier = determinePoolTier(currentAVP, previousAVP, POOL_TIERS);
      const currentTierIndex = POOL_TIERS.indexOf(poolTier);
      const monthlyPool = poolTier.poolSize as bigint;

      // Determine role
      const isActiveDelegate = activeDelegatesLower.has(address.toLowerCase());
      const accountBalances = await dataSource.delegations.getAccountBalances();
      const accountBalance = accountBalances.find(
        (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
      );
      const isDelegatorToActive =
        accountBalance !== undefined &&
        activeDelegatesLower.has(accountBalance.delegate.toLowerCase());

      if (!isActiveDelegate && !isDelegatorToActive) {
        return c.json(
          {
            address,
            role: "ineligible" as const,
            delegatedTo: accountBalance?.delegate ?? null,
            currentTierIndex,
            poolSizeEns: `${monthlyPool / (ONE_ENS as bigint)}`,
            estimatedMonthlyRewardEns: "0",
            estimatedApyPct: "0",
            userWeight: "0",
            totalPoolWeight: "0",
            currentBalanceEns: "0",
          },
          200,
        );
      }

      const twbWindowStart = seconds(
        (monthEnd as bigint) - (TWB_WINDOW_SECONDS as bigint),
      );

      if (isActiveDelegate) {
        // Delegate APY: based on their VP share of the 10% pool
        const vpMap = await dataSource.votingPower.getVotingPower(activeDelegateArray);
        const userVP = vpMap.get(address) ?? vpMap.get(address.toLowerCase()) ?? wei(0n);
        let totalVP = 0n;
        for (const vp of vpMap.values()) totalVP += vp as bigint;

        const delegatePool = applyBasisPoints(monthlyPool, DELEGATE_POOL_BPS as bigint);
        const estimatedReward = totalVP > 0n
          ? mulDiv(userVP as bigint, delegatePool, totalVP)
          : 0n;
        const cappedReward = estimatedReward > (poolTier.delegateCap as bigint)
          ? (poolTier.delegateCap as bigint)
          : estimatedReward;

        const rewardEns = Number(cappedReward) / Number(ONE_ENS);
        const balanceEns = Number(userVP) / Number(ONE_ENS);
        const apyPct = balanceEns > 0 ? (rewardEns * 12 / balanceEns) * 100 : 0;

        return c.json(
          {
            address,
            role: "delegate" as const,
            delegatedTo: null,
            currentTierIndex,
            poolSizeEns: `${monthlyPool / (ONE_ENS as bigint)}`,
            estimatedMonthlyRewardEns: rewardEns.toFixed(4),
            estimatedApyPct: apyPct.toFixed(2),
            userWeight: (userVP as bigint).toString(),
            totalPoolWeight: totalVP.toString(),
            currentBalanceEns: balanceEns.toFixed(4),
          },
          200,
        );
      }

      // Delegator APY: based on their TWB share of the 90% pool
      const balanceEvents = await dataSource.balances.getBalanceHistory(
        [address],
        twbWindowStart,
        monthEnd,
      );
      const initialBalance = await dataSource.balances.getBalanceAt(
        address,
        twbWindowStart,
      );
      const userTWB = computeTimeWeightedBalance(
        balanceEvents,
        twbWindowStart,
        monthEnd,
        initialBalance,
      );

      // Get current balance for APY denominator
      const currentBalance = await dataSource.balances.getBalanceAt(address, monthEnd);

      // Get total TWB of all eligible delegators (simplified: use all account balances as proxy)
      const delegations = await dataSource.delegations.getActiveDelegations(
        activeDelegateArray,
        monthEnd,
      );
      const allDelegatorIds = [...new Set(delegations.map((d) => d.delegatorId))];

      let totalTWB = 0n;
      for (const delegatorId of allDelegatorIds) {
        const events = await dataSource.balances.getBalanceHistory(
          [delegatorId],
          twbWindowStart,
          monthEnd,
        );
        const initBal = await dataSource.balances.getBalanceAt(
          delegatorId,
          twbWindowStart,
        );
        totalTWB += computeTimeWeightedBalance(events, twbWindowStart, monthEnd, initBal) as bigint;
      }

      const delegatorPool = applyBasisPoints(monthlyPool, DELEGATOR_POOL_BPS as bigint);
      const estimatedReward = totalTWB > 0n
        ? mulDiv(userTWB as bigint, delegatorPool, totalTWB)
        : 0n;
      const cappedReward = estimatedReward > (poolTier.delegatorCap as bigint)
        ? (poolTier.delegatorCap as bigint)
        : estimatedReward;

      const rewardEns = Number(cappedReward) / Number(ONE_ENS);
      const balanceEns = Number(currentBalance) / Number(ONE_ENS);
      const apyPct = balanceEns > 0 ? (rewardEns * 12 / balanceEns) * 100 : 0;

      return c.json(
        {
          address,
          role: "delegator" as const,
          delegatedTo: accountBalance?.delegate ?? null,
          currentTierIndex,
          poolSizeEns: `${monthlyPool / (ONE_ENS as bigint)}`,
          estimatedMonthlyRewardEns: rewardEns.toFixed(4),
          estimatedApyPct: apyPct.toFixed(2),
          userWeight: (userTWB as bigint).toString(),
          totalPoolWeight: totalTWB.toString(),
          currentBalanceEns: balanceEns.toFixed(4),
        },
        200,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  // OpenAPI JSON spec endpoint
  app.doc("/doc", {
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

  return app;
}
