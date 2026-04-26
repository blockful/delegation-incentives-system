import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { governanceProposal, distributionResult } from "ponder:schema";
import { sql, desc } from "drizzle-orm";
import { fetchActiveDelegates } from "../helpers.js";

const StatsResponse = z.object({
  activeDelegateCount: z.number().openapi({ example: 25 }),
  proposalCount: z.number().openapi({ example: 142 }),
  cachedDistributions: z.array(z.string()).openapi({ example: ["2026-03", "2026-02"] }),
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

    return c.json(
      {
        activeDelegateCount: activeDelegates.size,
        proposalCount,
        cachedDistributions,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
