import { Hono } from "hono";
import { db } from "ponder:api";
import { ensBalance, ensVotingPowerSnapshot } from "ponder:schema";
import { eq, desc } from "drizzle-orm";
import {
  POOL_TIERS,
  DELEGATOR_POOL_BPS,
  DELEGATE_POOL_BPS,
  BPS_BASE,
  type Address,
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

app.get("/api/apy/:address", async (c) => {
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

    const isDelegate = activeDelegates.has(address as Address);

    // For delegates, use their VP; for delegators, use their wallet balance
    let stake = 0n;
    if (isDelegate) {
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.accountId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);
      stake = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;
    } else {
      const balanceRows = await db
        .select({ balance: ensBalance.balance })
        .from(ensBalance)
        .where(eq(ensBalance.id, address))
        .limit(1);
      stake = balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;
    }

    // Compute estimated APY per tier
    const tiers = POOL_TIERS.map((tier) => {
      let estimatedApy = "0";

      if (stake > 0n && totalVp > 0n) {
        const poolBps = isDelegate ? DELEGATE_POOL_BPS : DELEGATOR_POOL_BPS;
        const pool = (tier.poolSize * poolBps) / BPS_BASE;
        const monthlyReward = (pool * stake) / totalVp;

        const cap = isDelegate ? tier.delegateCap : tier.delegatorCap;
        const cappedReward = monthlyReward < cap ? monthlyReward : cap;

        // APY = (cappedReward / stake) * 12 * 100
        const apyBps = (cappedReward * 1200n * 100n) / stake;
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
