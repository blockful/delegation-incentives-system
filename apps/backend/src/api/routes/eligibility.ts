import { Hono } from "hono";
import { db } from "ponder:api";
import { ensDelegation, multiDelegatePosition } from "ponder:schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchActiveDelegates, normalizeAddress } from "../helpers.js";

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

      return c.json({
        eligible: delegateIsActive,
        delegateTo,
        delegateIsActive,
        source: "direct",
      });
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
