import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { distributionResult } from "ponder:schema";
import { eq, desc } from "drizzle-orm";
import type { DistributionResult } from "@ens-dis/domain";
import { distributionToCsv } from "../../output/csv-writer.js";

function reviveBigInts(obj: any): DistributionResult {
  return {
    metadata: {
      ...obj.metadata,
      monthStart: BigInt(obj.metadata.monthStart),
      monthEnd: BigInt(obj.metadata.monthEnd),
      startBlock: BigInt(obj.metadata.startBlock),
      endBlock: BigInt(obj.metadata.endBlock),
      vpStart: BigInt(obj.metadata.vpStart),
      vpEnd: BigInt(obj.metadata.vpEnd),
      poolSize: BigInt(obj.metadata.poolSize),
      delegateCap: BigInt(obj.metadata.delegateCap),
      delegatorCap: BigInt(obj.metadata.delegatorCap),
    },
    rewards: obj.rewards.map((r: any) => ({
      ...r,
      delegateReward: BigInt(r.delegateReward),
      delegatorReward: BigInt(r.delegatorReward),
      total: BigInt(r.total),
    })),
    lottery: {
      buckets: obj.lottery.buckets.map((b: any) => ({
        ...b,
        prize: BigInt(b.prize),
        entries: b.entries.map((e: any) => ({
          ...e,
          amount: BigInt(e.amount),
        })),
      })),
    },
    deduplication: obj.deduplication,
  } as unknown as DistributionResult;
}

const MonthParam = z.object({
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .openapi({ param: { name: "month", in: "path" }, example: "2026-03" }),
});

// --- List months ---

const listRoute = createRoute({
  method: "get",
  path: "/distributions",
  tags: ["Distributions"],
  summary: "List distribution months",
  description: "Returns an array of YYYY-MM month strings for which distributions have been computed, most recent first.",
  responses: {
    200: {
      description: "Month list",
      content: {
        "application/json": {
          schema: z.array(z.string().openapi({ example: "2026-03" })),
        },
      },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

// --- Get distribution JSON ---

const getRoute = createRoute({
  method: "get",
  path: "/distributions/{month}",
  tags: ["Distributions"],
  summary: "Get distribution for a month",
  description: "Returns the full distribution result JSON for the requested month.",
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

// --- CSV export ---

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

const app = new OpenAPIHono();

app.openapi(listRoute, async (c) => {
  try {
    const rows = await db
      .select({ month: distributionResult.month })
      .from(distributionResult)
      .orderBy(desc(distributionResult.month));

    return c.json(rows.map((row) => row.month), 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.openapi(getRoute, async (c) => {
  try {
    const { month } = c.req.valid("param");

    const rows = await db
      .select()
      .from(distributionResult)
      .where(eq(distributionResult.month, month))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ error: `No distribution found for month ${month}` }, 404);
    }

    return c.json(JSON.parse(rows[0].resultJson), 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

app.openapi(csvRoute, async (c) => {
  try {
    const { month } = c.req.valid("param");

    const rows = await db
      .select()
      .from(distributionResult)
      .where(eq(distributionResult.month, month))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ error: `No distribution found for month ${month}` }, 404);
    }

    const result = reviveBigInts(JSON.parse(rows[0].resultJson));
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

export default app;
