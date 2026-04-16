import { Hono } from "hono";
import { db } from "ponder:api";
import { ensDelegation, multiDelegatePosition, vestingPlan } from "ponder:schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchActiveDelegates, normalizeAddress } from "../helpers.js";

const HEDGEY_VESTING_ADDRESS = "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";

const app = new Hono();

app.get("/api/eligibility/:address", async (c) => {
  try {
    const rawAddress = c.req.param("address");
    const address = normalizeAddress(rawAddress);

    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    const { activeDelegates } = await fetchActiveDelegates(db);

    // 1. Check direct delegation
    const delegationRows = await db
      .select({ delegateId: ensDelegation.delegateId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const delegateTo = delegationRows[0].delegateId;
      const delegateIsActive = activeDelegates.has(delegateTo as `0x${string}`);

      if (delegateIsActive) {
        return c.json({
          eligible: true,
          delegateTo,
          delegateIsActive: true,
          source: "direct",
        });
      }
      // Direct delegate is inactive — fall through to check multi-delegate
    }

    // 2. Check multi-delegate positions
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
      if (activeDelegates.has(pos.delegate as `0x${string}`)) {
        return c.json({
          eligible: true,
          delegateTo: pos.delegate,
          delegateIsActive: true,
          source: "multidelegate",
        });
      }
    }

    // 3. Check Hedgey vesting — user holds a vesting NFT whose contract
    //    delegates to an active delegate
    const vestingPlans = await db
      .select({ id: vestingPlan.id })
      .from(vestingPlan)
      .where(eq(vestingPlan.recipient, address))
      .limit(1);

    if (vestingPlans.length > 0) {
      // Check if the Hedgey vesting contract delegates to an active delegate
      const vestingDelegation = await db
        .select({ delegateId: ensDelegation.delegateId })
        .from(ensDelegation)
        .where(eq(ensDelegation.id, HEDGEY_VESTING_ADDRESS))
        .limit(1);

      if (vestingDelegation.length > 0) {
        const vestingDelegate = vestingDelegation[0].delegateId;
        if (activeDelegates.has(vestingDelegate as `0x${string}`)) {
          return c.json({
            eligible: true,
            delegateTo: vestingDelegate,
            delegateIsActive: true,
            source: "hedgey_vesting",
          });
        }
      }
    }

    // No eligible delegation found
    return c.json({
      eligible: false,
      delegateTo: null,
      delegateIsActive: false,
      source: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
