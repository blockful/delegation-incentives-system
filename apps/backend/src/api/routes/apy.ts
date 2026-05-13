import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import {
  ensBalance,
  ensVotingPowerSnapshot,
  ensDelegation,
  multiDelegatePosition,
} from "ponder:schema";
import { eq, desc, and, sql } from "drizzle-orm";
import {
  POOL_TIERS,
  TOKEN_HOLDER_POOL_BPS,
  VOTER_POOL_BPS,
  BPS_BASE,
  MIN_REWARD_THRESHOLD,
  estimateAprPct,
  wei,
  type Address,
} from "@ens-dis/domain";
import {
  fetchActiveVoters,
  fetchCurrentVpGrowth,
  formatEns,
  normalizeAddress,
  findTierIndex,
  getActiveVpTotal,
} from "../helpers.js";

const AddressParam = z.object({
  address: z
    .string()
    .openapi({ param: { name: "address", in: "path" }, example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
});

const AprResponse = z.object({
  address: z.string(),
  ensName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["voter", "token_holder", "ineligible"]),
  delegatedTo: z.string().nullable(),
  delegatedToEnsName: z.string().nullable(),
  delegatedToAvatarUrl: z.string().nullable(),
  poolSizeEns: z.string(),
  estimatedMonthlyRewardEns: z.string(),
  estimatedAprPct: z.string(),
  userShareWei: z.string(),
  totalShareWei: z.string(),
  currentBalanceEns: z.string(),
  qualifiesForLottery: z.boolean(),
});

const route = createRoute({
  method: "get",
  path: "/apr/{address}",
  tags: ["APR"],
  summary: "Estimate APR and rewards for an address",
  description:
    "Returns role, delegation info, estimated monthly reward, APR, and lottery qualification for the given address.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "APR estimate",
      content: { "application/json": { schema: AprResponse } },
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
    const { growthPct } = await fetchCurrentVpGrowth(
      db,
      activeVoters,
      activeVoters,
    );
    const currentTierIndex = findTierIndex(growthPct);
    const tier = POOL_TIERS[currentTierIndex];
    const totalVp = await getActiveVpTotal(db, activeVoters);

    const isVoter = activeVoters.has(address as Address);

    // Get user's ENS token balance
    const balanceRows = await db
      .select({ balance: ensBalance.balance })
      .from(ensBalance)
      .where(eq(ensBalance.id, address))
      .limit(1);
    const userBalance = balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;

    // Determine delegation target
    let delegatedTo: string | null = null;
    let isTokenHolderOfActive = false;

    // Direct delegation
    const delegationRows = await db
      .select({ voterId: ensDelegation.voterId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const voter = delegationRows[0].voterId;
      if (activeVoters.has(voter as Address)) {
        delegatedTo = voter;
        isTokenHolderOfActive = true;
      }
    }

    // Multi-delegate fallback
    if (!isTokenHolderOfActive) {
      const multiPositions = await db
        .select({ voter: multiDelegatePosition.voter, amount: multiDelegatePosition.amount })
        .from(multiDelegatePosition)
        .where(and(eq(multiDelegatePosition.owner, address), sql`${multiDelegatePosition.amount} > 0`));

      for (const pos of multiPositions) {
        if (activeVoters.has(pos.voter as Address)) {
          delegatedTo = pos.voter;
          isTokenHolderOfActive = true;
          break;
        }
      }
    }

    // Determine role
    let role: "voter" | "token_holder" | "ineligible" = "ineligible";
    if (isVoter) role = "voter";
    else if (isTokenHolderOfActive) role = "token_holder";

    // Compute reward estimate
    let monthlyReward = 0n;
    let userShare = 0n;

    if (role === "voter" && totalVp > 0n) {
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.voterId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);
      userShare = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;

      const voterSubPool = (tier.poolSize * (VOTER_POOL_BPS as bigint)) / (BPS_BASE as bigint);
      const raw = totalVp > 0n ? (voterSubPool * userShare) / totalVp : 0n;
      monthlyReward = raw < tier.voterCap ? raw : (tier.voterCap as bigint);
    } else if (role === "token_holder" && totalVp > 0n) {
      userShare = userBalance;
      const tokenHolderSubPool = (tier.poolSize * (TOKEN_HOLDER_POOL_BPS as bigint)) / (BPS_BASE as bigint);
      const raw = totalVp > 0n ? (tokenHolderSubPool * userBalance) / totalVp : 0n;
      monthlyReward = raw < tier.tokenHolderCap ? raw : (tier.tokenHolderCap as bigint);
    }

    const estimatedAprPct = estimateAprPct(wei(monthlyReward), wei(userShare));

    const qualifiesForLottery = monthlyReward > 0n && monthlyReward < (MIN_REWARD_THRESHOLD as bigint);

    return c.json(
      {
        address,
        ensName: null,      // ENS resolution handled client-side
        avatarUrl: null,     // ENS resolution handled client-side
        role,
        delegatedTo,
        delegatedToEnsName: null,     // ENS resolution handled client-side
        delegatedToAvatarUrl: null,   // ENS resolution handled client-side
        poolSizeEns: formatEns(tier.poolSize as bigint),
        estimatedMonthlyRewardEns: formatEns(monthlyReward),
        estimatedAprPct,
        userShareWei: userShare.toString(),
        totalShareWei: totalVp.toString(),
        currentBalanceEns: formatEns(userBalance),
        qualifiesForLottery,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
