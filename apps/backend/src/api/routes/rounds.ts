import { Hono } from "hono";
import { db } from "ponder:api";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  getCurrentMonth,
  getDaysRemainingInMonth,
  findTierIndex,
} from "../helpers.js";

const app = new Hono();

app.get("/api/rounds/current", async (c) => {
  try {
    const { activeDelegates } = await fetchActiveDelegates(db);
    const { growthPct } = await fetchCurrentVpGrowth(db, activeDelegates, activeDelegates);

    const month = getCurrentMonth();
    const daysRemaining = getDaysRemainingInMonth();
    const currentTier = findTierIndex(growthPct);

    return c.json({
      month,
      daysRemaining,
      vpGrowthSoFar: growthPct.toFixed(2),
      currentTier,
      activeDelegateCount: activeDelegates.size,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
