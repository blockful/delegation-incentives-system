import { Hono } from "hono";
import type { IncentivesDataSource } from "@/data/interfaces.js";
import { runDistributionPipeline } from "@/pipeline/distribution-pipeline.js";
import { distributionToCsv } from "@/output/csv-writer.js";
import { distributionToJson } from "@/output/json-writer.js";
import { identifyActiveDelegates } from "@/domain/active-delegates.js";
import { PROPOSAL_WINDOW_SIZE, type DistributionResult } from "@/domain/types.js";

export interface ApiDeps {
  dataSource: IncentivesDataSource;
}

export function createApi(deps: ApiDeps): Hono {
  const app = new Hono();
  const { dataSource } = deps;

  // In-memory cache of computed distributions
  const distributionCache = new Map<string, DistributionResult>();

  // Health check
  app.get("/health", (c) => c.json({ status: "ok" }));

  // Trigger distribution computation for a month
  app.post("/distributions/:month/compute", async (c) => {
    const month = c.req.param("month");

    // Validate month format
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ error: "Invalid month format. Expected YYYY-MM" }, 400);
    }

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
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  // Get computed distribution result (JSON)
  app.get("/distributions/:month", async (c) => {
    const month = c.req.param("month");
    const result = distributionCache.get(month);
    if (!result) {
      return c.json(
        { error: "Distribution not computed yet. POST to /distributions/:month/compute first" },
        404,
      );
    }
    return c.text(distributionToJson(result), 200, {
      "Content-Type": "application/json",
    });
  });

  // Download distribution as CSV
  app.get("/distributions/:month/csv", async (c) => {
    const month = c.req.param("month");
    const result = distributionCache.get(month);
    if (!result) {
      return c.json({ error: "Distribution not computed yet" }, 404);
    }
    return c.text(distributionToCsv(result), 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="distribution-${month}.csv"`,
    });
  });

  // List current active delegates
  app.get("/delegates/active", async (c) => {
    try {
      const proposals = await dataSource.proposals.getRecentProposals(
        PROPOSAL_WINDOW_SIZE,
      );
      const proposalIds = proposals.map((p) => p.id);
      const votes =
        await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);
      return c.json({
        count: activeDelegates.size,
        delegates: Array.from(activeDelegates),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  // Check eligibility for an address
  app.get("/eligibility/:address", async (c) => {
    const address = c.req.param("address");

    try {
      // Check if delegate
      const proposals = await dataSource.proposals.getRecentProposals(
        PROPOSAL_WINDOW_SIZE,
      );
      const proposalIds = proposals.map((p) => p.id);
      const votes =
        await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);

      // Case-insensitive lookup
      const activeDelegatesLower = new Set(
        Array.from(activeDelegates).map((d) => d.toLowerCase()),
      );
      const isActiveDelegate = activeDelegatesLower.has(address.toLowerCase());

      // Check if delegator to an active delegate
      const accountBalances = await dataSource.delegations.getAccountBalances();
      const accountBalance = accountBalances.find(
        (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
      );
      const isDelegatorToActive =
        accountBalance !== undefined &&
        activeDelegatesLower.has(accountBalance.delegate.toLowerCase());

      return c.json({
        address,
        isActiveDelegate,
        isDelegatorToActiveDelegate: isDelegatorToActive,
        eligible: isActiveDelegate || isDelegatorToActive,
        delegatedTo: accountBalance?.delegate ?? null,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  // Status endpoint
  app.get("/status", async (c) => {
    try {
      const proposals = await dataSource.proposals.getRecentProposals(
        PROPOSAL_WINDOW_SIZE,
      );
      const proposalIds = proposals.map((p) => p.id);
      const votes =
        await dataSource.votes.getVotesForProposals(proposalIds);
      const activeDelegates = identifyActiveDelegates(proposals, votes);

      return c.json({
        activeDelegateCount: activeDelegates.size,
        proposalCount: proposals.length,
        cachedDistributions: Array.from(distributionCache.keys()),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  return app;
}
