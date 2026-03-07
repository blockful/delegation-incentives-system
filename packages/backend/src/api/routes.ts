import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import type { IncentivesDataSource } from "@/data/interfaces.js";
import { runDistributionPipeline } from "@/pipeline/distribution-pipeline.js";
import { distributionToCsv } from "@/output/csv-writer.js";
import { distributionToJson } from "@/output/json-writer.js";
import { identifyActiveDelegates } from "@/domain/active-delegates.js";
import { PROPOSAL_WINDOW_SIZE, type DistributionResult } from "@/domain/types.js";

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
    ],
  });

  return app;
}
