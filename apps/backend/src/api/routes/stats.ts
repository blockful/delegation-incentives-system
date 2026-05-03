import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { governanceProposal, distributionResult, ensDelegation } from "ponder:schema";
import { sql, desc, inArray } from "drizzle-orm";
import { fetchActiveDelegates, getActiveVpTotal, formatEns } from "../helpers.js";

const StatsResponse = z.object({
  activeDelegateCount: z.number().openapi({ example: 25 }),
  proposalCount: z.number().openapi({ example: 142 }),
  cachedDistributions: z.array(z.string()).openapi({ example: ["2026-03", "2026-02"] }),
  totalDelegatedEns: z
    .string()
    .openapi({
      description: "Total ENS held by active delegates (sum of latest VP snapshots), formatted as ENS string",
      example: "1250000.000000000000000000",
    }),
  holdersEarning: z
    .number()
    .openapi({
      description: "Current count of active delegates plus unique direct delegators to active delegates. This is live delegation state, not finalized round payout recipients.",
      example: 412,
    }),
});

const route = createRoute({
  method: "get",
  path: "/stats",
  tags: ["System"],
  summary: "System statistics",
  description:
    "Returns active delegate count, total indexed proposals, and available distribution months.",
  responses: {
    200: {
      description: "System stats",
      content: { "application/json": { schema: StatsResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

const app = new OpenAPIHono();

app.openapi(route, async (c) => {
  try {
    const { activeDelegates } = await fetchActiveDelegates(db);

    const proposalCountRows = await db
      .select({ count: sql<number>`count(*)` })
      .from(governanceProposal);
    const proposalCount = Number(proposalCountRows[0]?.count ?? 0);

    const distRows = await db
      .select({ month: distributionResult.month })
      .from(distributionResult)
      .orderBy(desc(distributionResult.month));
    const cachedDistributions = distRows.map((r) => r.month);

    const totalDelegatedWei = await getActiveVpTotal(db, activeDelegates);
    const totalDelegatedEns = formatEns(totalDelegatedWei);

    let holdersEarning = activeDelegates.size;
    if (activeDelegates.size > 0) {
      const activeList = [...activeDelegates].map((a) => a.toLowerCase());
      const delegatorRows = await db
        .select({ delegator: ensDelegation.id })
        .from(ensDelegation)
        .where(inArray(ensDelegation.delegateId, activeList));

      const uniqueDelegators = new Set<string>();
      for (const row of delegatorRows) {
        const delegator = row.delegator.toLowerCase();
        if (!activeDelegates.has(delegator as `0x${string}`)) {
          uniqueDelegators.add(delegator);
        }
      }
      holdersEarning += uniqueDelegators.size;
    }

    return c.json(
      {
        activeDelegateCount: activeDelegates.size,
        proposalCount,
        cachedDistributions,
        totalDelegatedEns,
        holdersEarning,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
