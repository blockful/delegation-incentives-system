import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { POOL_TIERS } from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  findTierIndex,
  formatEns,
} from "../helpers.js";

const RoundResponse = z.object({
  roundNumber: z.number().openapi({ description: "Sequential round number (months since program start)", example: 3 }),
  startDate: z.string().openapi({ description: "ISO 8601 start of the round", example: "2026-04-01T00:00:00.000Z" }),
  endDate: z.string().openapi({ description: "ISO 8601 end of the round", example: "2026-04-30T23:59:59.999Z" }),
  percentComplete: z.number().openapi({ description: "Percentage of round elapsed (0-100)", example: 53 }),
  daysRemaining: z.number().openapi({ example: 14 }),
  poolSizeEns: z.string().openapi({ description: "Current tier pool size in ENS", example: "5000.000000000000000000" }),
  tierIndex: z.number().openapi({ example: 1 }),
  vpGrowthPct: z.string().openapi({ description: "Month-over-month active VP growth percentage", example: "9.09" }),
});

const route = createRoute({
  method: "get",
  path: "/rounds/current",
  tags: ["Rounds"],
  summary: "Current incentive round",
  description:
    "Returns the current round info: dates, progress, pool size, and active tier index.",
  responses: {
    200: {
      description: "Current round info",
      content: { "application/json": { schema: RoundResponse } },
    },
    500: {
      description: "Internal server error",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
    },
  },
});

/** Parse ROUND_MONTHS env var into sorted list. */
function getRoundMonths(): string[] {
  const raw = process.env.ROUND_MONTHS ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^\d{4}-\d{2}$/.test(s))
    .sort();
}

const app = new OpenAPIHono();

app.openapi(route, async (c) => {
  try {
    const { activeDelegates } = await fetchActiveDelegates(db);
    const { growthPct } = await fetchCurrentVpGrowth(
      db,
      activeDelegates,
      activeDelegates,
    );

    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth(); // 0-based
    const currentMonth = `${year}-${String(month + 1).padStart(2, "0")}`;

    // Round number: 1-based index into ROUND_MONTHS
    const roundMonths = getRoundMonths();
    const roundIndex = roundMonths.indexOf(currentMonth);
    const roundNumber = roundIndex >= 0 ? roundIndex + 1 : 1;

    const startDate = new Date(Date.UTC(year, month, 1)).toISOString();
    const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const endDate = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999)).toISOString();

    const currentDay = now.getUTCDate();
    const daysRemaining = lastDay - currentDay;
    const percentComplete = Math.round((currentDay / lastDay) * 100);

    const tierIndex = findTierIndex(growthPct);
    const poolSizeEns = formatEns(POOL_TIERS[tierIndex].poolSize as bigint);

    return c.json(
      {
        roundNumber,
        startDate,
        endDate,
        percentComplete,
        daysRemaining,
        poolSizeEns,
        tierIndex,
        vpGrowthPct: growthPct.toFixed(2),
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
