import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  getCurrentMonth,
  getDaysRemainingInMonth,
  findTierIndex,
} from "../helpers.js";

const RoundResponse = z.object({
  month: z.string().openapi({ example: "2026-04" }),
  daysRemaining: z.number().openapi({ example: 14 }),
  vpStart: z
    .string()
    .openapi({ description: "Active VP at the start of the round", example: "100000000000000000000000" }),
  vpCurrent: z
    .string()
    .openapi({ description: "Active VP now", example: "107230000000000000000000" }),
  vpGrowthSoFar: z.string().openapi({ example: "7.23" }),
  currentTier: z.number().openapi({ example: 1 }),
  activeDelegateCount: z.number().openapi({ example: 25 }),
});

const route = createRoute({
  method: "get",
  path: "/rounds/current",
  tags: ["Rounds"],
  summary: "Current incentive round",
  description:
    "Returns the current calendar month, VP at round start and now, growth so far, active tier, and days remaining.",
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

const app = new OpenAPIHono();

app.openapi(route, async (c) => {
  try {
    const { activeDelegates } = await fetchActiveDelegates(db);
    const { vpStart, vpEnd, growthPct } = await fetchCurrentVpGrowth(
      db,
      activeDelegates,
      activeDelegates,
    );

    return c.json(
      {
        month: getCurrentMonth(),
        daysRemaining: getDaysRemainingInMonth(),
        vpStart: (vpStart as bigint).toString(),
        vpCurrent: (vpEnd as bigint).toString(),
        vpGrowthSoFar: growthPct.toFixed(2),
        currentTier: findTierIndex(growthPct),
        activeDelegateCount: activeDelegates.size,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
