import { Hono } from "hono";
import { db } from "ponder:api";
import { ensBalance } from "ponder:schema";
import { eq } from "drizzle-orm";
import {
  POOL_TIERS,
  DELEGATOR_POOL_BPS,
  BPS_BASE,
} from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  formatGrowthRange,
  normalizeAddress,
  findTierIndex,
  getActiveVpTotal,
} from "../helpers.js";

const app = new Hono();

app.get("/api/apy/estimate/:address", async (c) => {
  try {
    const rawAddress = c.req.param("address");
    const address = normalizeAddress(rawAddress);

    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    const { activeDelegates } = await fetchActiveDelegates(db);
    const { growthPct } = await fetchCurrentVpGrowth(db, activeDelegates, activeDelegates);
    const currentTierIndex = findTierIndex(growthPct);
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    // Get the address's current balance
    const balanceRows = await db
      .select({ balance: ensBalance.balance })
      .from(ensBalance)
      .where(eq(ensBalance.id, address))
      .limit(1);

    const balance = balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;

    // Compute estimated APY per tier
    const tiers = POOL_TIERS.map((tier) => {
      let estimatedApy = "0";

      if (balance > 0n && totalVp > 0n) {
        const delegatorPool = (tier.poolSize * DELEGATOR_POOL_BPS) / BPS_BASE;
        const monthlyReward = (delegatorPool * balance) / totalVp;

        // Cap at delegator cap
        const cappedReward = monthlyReward < tier.delegatorCap ? monthlyReward : tier.delegatorCap;

        // APY = (monthlyReward / balance) * 12 * 100
        // Scaled: (cappedReward * 1200 * 100) / balance gives basis points
        const apyBps = (cappedReward * 1200n * 100n) / balance;
        const apyWhole = Number(apyBps) / 100;
        estimatedApy = apyWhole.toFixed(2);
      }

      return {
        growthRange: formatGrowthRange(tier),
        poolSize: tier.poolSize.toString(),
        delegateCap: tier.delegateCap.toString(),
        delegatorCap: tier.delegatorCap.toString(),
        estimatedApy,
      };
    });

    return c.json({
      currentTierApy: tiers[currentTierIndex]?.estimatedApy ?? "0",
      tiers,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
