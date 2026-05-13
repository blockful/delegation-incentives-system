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
  VOTER_POOL_BPS,
  TOKEN_HOLDER_POOL_BPS,
  BPS_BASE,
  MIN_REWARD_THRESHOLD,
  type Address,
} from "@ens-dis/domain";
import {
  fetchActiveVoters,
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
  voterReward: z.string().openapi({ example: "500000000000000000000" }),
  tokenHolderReward: z.string().openapi({ example: "150000000000000000000" }),
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
    "Estimates voter and token-holder rewards for the current month based on current VP, delegation state, and tier.",
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

    const { activeVoters } = await fetchActiveVoters(db);
    const { tier, growthPct } = await fetchCurrentVpGrowth(
      db,
      activeVoters,
      activeVoters,
    );
    const totalVp = await getActiveVpTotal(db, activeVoters);

    let voterReward = 0n;
    let tokenHolderReward = 0n;

    // --- Voter reward ---
    if (activeVoters.has(address)) {
      const voterSubPool = (tier.poolSize * VOTER_POOL_BPS) / BPS_BASE;

      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.voterId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);

      const myVp = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;

      if (totalVp > 0n) {
        const rawReward = (voterSubPool * myVp) / totalVp;
        voterReward = rawReward < tier.voterCap ? rawReward : tier.voterCap;
      }
    }

    // --- Token-holder reward ---
    let delegatingToActive = false;
    let myBalance = 0n;

    const delegationRows = await db
      .select({ voterId: ensDelegation.voterId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const voter = delegationRows[0].voterId as Address;
      if (activeVoters.has(voter)) {
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
        voter: multiDelegatePosition.voter,
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
      if (activeVoters.has(pos.voter as Address)) {
        delegatingToActive = true;
        myBalance += BigInt(pos.amount);
      }
    }

    if (delegatingToActive && myBalance > 0n && totalVp > 0n) {
      const tokenHolderSubPool = (tier.poolSize * TOKEN_HOLDER_POOL_BPS) / BPS_BASE;
      const rawReward = (tokenHolderSubPool * myBalance) / totalVp;
      tokenHolderReward =
        rawReward < tier.tokenHolderCap ? rawReward : tier.tokenHolderCap;
    }

    const combinedReward = voterReward + tokenHolderReward;

    return c.json(
      {
        voterReward: voterReward.toString(),
        tokenHolderReward: tokenHolderReward.toString(),
        combinedReward: combinedReward.toString(),
        aboveThreshold: combinedReward >= MIN_REWARD_THRESHOLD,
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
