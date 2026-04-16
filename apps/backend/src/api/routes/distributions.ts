import { Hono } from "hono";
import { db } from "ponder:api";
import { distributionResult } from "ponder:schema";
import { eq, desc } from "drizzle-orm";
import type { DistributionResult } from "@ens-dis/domain";
import { distributionToCsv } from "../../output/csv-writer.js";

/**
 * Revive BigInt strings from stored JSON back into BigInts.
 * The stored JSON has bigints serialized as decimal strings.
 * For CSV export, we need them back as bigints so distributionToCsv works.
 */
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

const app = new Hono();

// GET /api/distributions -- List past months
app.get("/api/distributions", async (c) => {
  try {
    const rows = await db
      .select({
        month: distributionResult.month,
        computedAt: distributionResult.computedAt,
      })
      .from(distributionResult)
      .orderBy(desc(distributionResult.month));

    return c.json(rows.map((row) => row.month));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/distributions/:month -- Full JSON for a month
app.get("/api/distributions/:month", async (c) => {
  try {
    const month = c.req.param("month");

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ error: "Invalid month format. Use YYYY-MM." }, 400);
    }

    const rows = await db
      .select()
      .from(distributionResult)
      .where(eq(distributionResult.month, month))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ error: `No distribution found for month ${month}` }, 404);
    }

    const result = JSON.parse(rows[0].resultJson);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

// GET /api/distributions/:month/csv -- CSV export
app.get("/api/distributions/:month/csv", async (c) => {
  try {
    const month = c.req.param("month");

    if (!/^\d{4}-\d{2}$/.test(month)) {
      return c.json({ error: "Invalid month format. Use YYYY-MM." }, 400);
    }

    const rows = await db
      .select()
      .from(distributionResult)
      .where(eq(distributionResult.month, month))
      .limit(1);

    if (rows.length === 0) {
      return c.json({ error: `No distribution found for month ${month}` }, 404);
    }

    const parsed = JSON.parse(rows[0].resultJson);
    const result = reviveBigInts(parsed);
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
