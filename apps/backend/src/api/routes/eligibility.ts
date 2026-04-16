import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { ensDelegation, multiDelegatePosition, vestingPlan } from "ponder:schema";
import { eq, and, sql } from "drizzle-orm";
import { fetchActiveDelegates, normalizeAddress } from "../helpers.js";

const HEDGEY_VESTING_ADDRESS = "0x2cde9919e81b20b4b33dd562a48a84b54c48f00c";

const AddressParam = z.object({
  address: z
    .string()
    .openapi({ param: { name: "address", in: "path" }, example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
});

const EligibilityResponse = z.object({
  eligible: z.boolean(),
  delegatedTo: z.string().nullable().openapi({ example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
  isDelegatorToActiveDelegate: z.boolean(),
  source: z
    .enum(["direct", "multidelegate", "hedgey_vesting"])
    .nullable()
    .openapi({ example: "direct" }),
});

const route = createRoute({
  method: "get",
  path: "/eligibility/{address}",
  tags: ["Eligibility"],
  summary: "Check delegation eligibility",
  description:
    "Checks whether an address is eligible for incentives by verifying it delegates (directly, via multi-delegate, or via Hedgey vesting) to an active delegate.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "Eligibility result",
      content: { "application/json": { schema: EligibilityResponse } },
    },
    400: {
      description: "Invalid address",
      content: { "application/json": { schema: z.object({ error: z.string() }) } },
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
    const { address: rawAddress } = c.req.valid("param");
    const address = normalizeAddress(rawAddress);

    if (!address) {
      return c.json({ error: "Invalid Ethereum address" }, 400);
    }

    const { activeDelegates } = await fetchActiveDelegates(db);

    // 1. Direct delegation
    const delegationRows = await db
      .select({ delegateId: ensDelegation.delegateId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const delegateTo = delegationRows[0].delegateId;
      if (activeDelegates.has(delegateTo as `0x${string}`)) {
        return c.json(
          { eligible: true, delegatedTo: delegateTo, isDelegatorToActiveDelegate: true, source: "direct" as const },
          200,
        );
      }
    }

    // 2. Multi-delegate positions
    const multiPositions = await db
      .select({ delegate: multiDelegatePosition.delegate, amount: multiDelegatePosition.amount })
      .from(multiDelegatePosition)
      .where(and(eq(multiDelegatePosition.owner, address), sql`${multiDelegatePosition.amount} > 0`));

    for (const pos of multiPositions) {
      if (activeDelegates.has(pos.delegate as `0x${string}`)) {
        return c.json(
          { eligible: true, delegatedTo: pos.delegate, isDelegatorToActiveDelegate: true, source: "multidelegate" as const },
          200,
        );
      }
    }

    // 3. Hedgey vesting
    const vestingPlans = await db
      .select({ id: vestingPlan.id })
      .from(vestingPlan)
      .where(eq(vestingPlan.recipient, address))
      .limit(1);

    if (vestingPlans.length > 0) {
      const vestingDelegation = await db
        .select({ delegateId: ensDelegation.delegateId })
        .from(ensDelegation)
        .where(eq(ensDelegation.id, HEDGEY_VESTING_ADDRESS))
        .limit(1);

      if (vestingDelegation.length > 0) {
        const vestingDelegate = vestingDelegation[0].delegateId;
        if (activeDelegates.has(vestingDelegate as `0x${string}`)) {
          return c.json(
            { eligible: true, delegatedTo: vestingDelegate, isDelegatorToActiveDelegate: true, source: "hedgey_vesting" as const },
            200,
          );
        }
      }
    }

    return c.json(
      { eligible: false, delegatedTo: null, isDelegatorToActiveDelegate: false, source: null },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
