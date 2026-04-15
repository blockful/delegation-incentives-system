import { Hono } from "hono";
import { db } from "ponder:api";
import { POOL_TIERS } from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  formatGrowthRange,
  findTierIndex,
} from "../helpers.js";

const app = new Hono();

app.get("/api/tiers", async (c) => {
  try {
    const { activeDelegates } = await fetchActiveDelegates(db);
    const { growthPct } = await fetchCurrentVpGrowth(db, activeDelegates, activeDelegates);
    const currentTier = findTierIndex(growthPct);

    const tiers = POOL_TIERS.map((tier, index) => ({
      index,
      growthRange: formatGrowthRange(tier),
      poolSize: tier.poolSize.toString(),
      delegateCap: tier.delegateCap.toString(),
      delegatorCap: tier.delegatorCap.toString(),
    }));

    return c.json({
      currentVpGrowth: growthPct.toFixed(2),
      currentTier,
      tiers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
