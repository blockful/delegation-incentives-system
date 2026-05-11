import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
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

const AddressParam = z.object({
  address: z
    .string()
    .openapi({ param: { name: "address", in: "path" }, example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
});

const RewardsResponse = z.object({
  delegateReward: z.string().openapi({ example: "500000000000000000000" }),
  delegatorReward: z.string().openapi({ example: "150000000000000000000" }),
  combinedReward: z.string().openapi({ example: "650000000000000000000" }),
  aboveThreshold: z.boolean(),
  currentTier: z.number().openapi({ example: 1 }),
});

const route = createRoute({
  method: "get",
  path: "/rewards/estimate/{address}",
  tags: ["Rewards"],
  summary: "Estimate rewards for an address",
  description:
    "Estimates delegate and delegator rewards for the current month based on current VP, delegation state, and tier.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "Reward estimate",
      content: { "application/json": { schema: RewardsResponse } },
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
    const { tier, growthPct } = await fetchCurrentVpGrowth(
      db,
      activeDelegates,
      activeDelegates,
    );
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    let delegateReward = 0n;
    let delegatorReward = 0n;

    // --- Delegate reward ---
    if (activeDelegates.has(address)) {
      const delegatePool = (tier.poolSize * DELEGATE_POOL_BPS) / BPS_BASE;

      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.accountId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      const myVp = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;

      if (totalVp > 0n) {
        const rawReward = (delegatePool * myVp) / totalVp;
        delegateReward = rawReward < tier.delegateCap ? rawReward : tier.delegateCap;
      }
    }

    // --- Delegator reward ---
    let delegatingToActive = false;
    let myBalance = 0n;

    const delegationRows = await db
      .select({ delegateId: ensDelegation.delegateId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const delegate = delegationRows[0].delegateId as Address;
      if (activeDelegates.has(delegate)) {
        delegatingToActive = true;

        const balanceRows = await db
          .select({ balance: ensBalance.balance })
          .from(ensBalance)
          .where(eq(ensBalance.id, address))
          .limit(1);

        myBalance =
          balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;
      }
    }

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

    if (delegatingToActive && myBalance > 0n && totalVp > 0n) {
      const delegatorPool = (tier.poolSize * DELEGATOR_POOL_BPS) / BPS_BASE;
      const rawReward = (delegatorPool * myBalance) / totalVp;
      delegatorReward =
        rawReward < tier.delegatorCap ? rawReward : tier.delegatorCap;
    }

    const combinedReward = delegateReward + delegatorReward;

    return c.json(
      {
        delegateReward: delegateReward.toString(),
        delegatorReward: delegatorReward.toString(),
        combinedReward: combinedReward.toString(),
        aboveThreshold: combinedReward >= MIN_PAYOUT,
        currentTier: findTierIndex(growthPct),
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
