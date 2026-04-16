import { Hono } from "hono";
import { db } from "ponder:api";
import {
  ensVotingPowerSnapshot,
  ensBalance,
  ensDelegation,
  multiDelegatePosition,
} from "ponder:schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  DELEGATE_POOL_BPS,
  DELEGATOR_POOL_BPS,
  BPS_BASE,
  MIN_PAYOUT,
  type Address,
} from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  normalizeAddress,
  findTierIndex,
  getActiveVpTotal,
} from "../helpers.js";

const app = new Hono();

app.get("/api/rewards/estimate/:address", async (c) => {
  try {
    const rawAddress = c.req.param("address");
    const address = normalizeAddress(rawAddress);

    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    const { activeDelegates } = await fetchActiveDelegates(db);
    const { tier, growthPct } = await fetchCurrentVpGrowth(db, activeDelegates, activeDelegates);
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    let delegateReward = 0n;
    let delegatorReward = 0n;

    // --- Delegate reward estimate ---
    if (activeDelegates.has(address)) {
      const delegatePool = (tier.poolSize * DELEGATE_POOL_BPS) / BPS_BASE;

      // Get this delegate's VP
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.accountId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      const myVp = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;

      if (totalVp > 0n) {
        const rawReward = (delegatePool * myVp) / totalVp;
        const cap = tier.delegateCap;
        delegateReward = rawReward < cap ? rawReward : cap;
      }
    }

    // --- Delegator reward estimate ---
    let delegatingToActive = false;
    let myBalance = 0n;

    // Check direct delegation
    const delegationRows = await db
      .select({ delegateId: ensDelegation.delegateId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const delegate = delegationRows[0].delegateId as Address;
      if (activeDelegates.has(delegate)) {
        delegatingToActive = true;
      }
    }

    // Check multi-delegate positions if not already found
    if (!delegatingToActive) {
      const multiPositions = await db
        .select({
          delegate: multiDelegatePosition.delegate,
          amount: multiDelegatePosition.amount,
        })
        .from(multiDelegatePosition)
        .where(
          and(
            eq(multiDelegatePosition.owner, address),
            sql`${multiDelegatePosition.amount} > 0`,
          ),
        );

      for (const pos of multiPositions) {
        if (activeDelegates.has(pos.delegate as Address)) {
          delegatingToActive = true;
          myBalance += BigInt(pos.amount);
        }
      }
    }

    if (delegatingToActive) {
      // Get balance if not already set from multi-delegate
      if (myBalance === 0n) {
        const balanceRows = await db
          .select({ balance: ensBalance.balance })
          .from(ensBalance)
          .where(eq(ensBalance.id, address))
          .limit(1);

        myBalance = balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;
      }

      if (myBalance > 0n && totalVp > 0n) {
        const delegatorPool = (tier.poolSize * DELEGATOR_POOL_BPS) / BPS_BASE;
        const rawReward = (delegatorPool * myBalance) / totalVp;
        const cap = tier.delegatorCap;
        delegatorReward = rawReward < cap ? rawReward : cap;
      }
    }

    const combinedReward = delegateReward + delegatorReward;
    const aboveThreshold = combinedReward >= MIN_PAYOUT;
    const currentTier = findTierIndex(growthPct);

    return c.json({
      delegateReward: delegateReward.toString(),
      delegatorReward: delegatorReward.toString(),
      combinedReward: combinedReward.toString(),
      aboveThreshold,
      currentTier,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
