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
  DELEGATOR_POOL_BPS,
  DELEGATE_POOL_BPS,
  BPS_BASE,
  MIN_PAYOUT,
  type Address,
} from "@ens-dis/domain";
import {
  fetchActiveDelegates,
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

const ApyResponse = z.object({
  address: z.string(),
  ensName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: z.enum(["delegate", "delegator", "ineligible"]),
  delegatedTo: z.string().nullable(),
  delegatedToEnsName: z.string().nullable(),
  delegatedToAvatarUrl: z.string().nullable(),
  poolSizeEns: z.string(),
  estimatedMonthlyRewardEns: z.string(),
  estimatedApyPct: z.string(),
  userShareWei: z.string(),
  totalShareWei: z.string(),
  currentBalanceEns: z.string(),
  qualifiesForLottery: z.boolean(),
});

const route = createRoute({
  method: "get",
  path: "/apy/{address}",
  tags: ["APY"],
  summary: "Estimate APY and rewards for an address",
  description:
    "Returns role, delegation info, estimated monthly reward, APY, and lottery qualification for the given address.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "APY estimate",
      content: { "application/json": { schema: ApyResponse } },
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
    const { growthPct } = await fetchCurrentVpGrowth(
      db,
      activeDelegates,
      activeDelegates,
    );
    const currentTierIndex = findTierIndex(growthPct);
    const tier = POOL_TIERS[currentTierIndex];
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    const isDelegate = activeDelegates.has(address as Address);

    // Get user's ENS token balance
    const balanceRows = await db
      .select({ balance: ensBalance.balance })
      .from(ensBalance)
      .where(eq(ensBalance.id, address))
      .limit(1);
    const userBalance = balanceRows.length > 0 ? BigInt(balanceRows[0].balance) : 0n;

    // Determine delegation target
    let delegatedTo: string | null = null;
    let isDelegatorToActive = false;

    // Direct delegation
    const delegationRows = await db
      .select({ delegateId: ensDelegation.delegateId })
      .from(ensDelegation)
      .where(eq(ensDelegation.id, address))
      .limit(1);

    if (delegationRows.length > 0) {
      const delegate = delegationRows[0].delegateId;
      if (activeDelegates.has(delegate as Address)) {
        delegatedTo = delegate;
        isDelegatorToActive = true;
      }
    }

    // Multi-delegate fallback
    if (!isDelegatorToActive) {
      const multiPositions = await db
        .select({ delegate: multiDelegatePosition.delegate, amount: multiDelegatePosition.amount })
        .from(multiDelegatePosition)
        .where(and(eq(multiDelegatePosition.owner, address), sql`${multiDelegatePosition.amount} > 0`));

      for (const pos of multiPositions) {
        if (activeDelegates.has(pos.delegate as Address)) {
          delegatedTo = pos.delegate;
          isDelegatorToActive = true;
          break;
        }
      }
    }

    // Determine role
    let role: "delegate" | "delegator" | "ineligible" = "ineligible";
    if (isDelegate) role = "delegate";
    else if (isDelegatorToActive) role = "delegator";

    // Compute reward estimate
    let monthlyReward = 0n;
    let userShare = 0n;

    if (role === "delegate" && totalVp > 0n) {
      const vpRows = await db
        .select({ votingPower: ensVotingPowerSnapshot.votingPower })
        .from(ensVotingPowerSnapshot)
        .where(eq(ensVotingPowerSnapshot.accountId, address))
        .orderBy(desc(ensVotingPowerSnapshot.timestamp))
        .limit(1);
      userShare = vpRows.length > 0 ? BigInt(vpRows[0].votingPower) : 0n;

      const delegatePool = (tier.poolSize * (DELEGATE_POOL_BPS as bigint)) / (BPS_BASE as bigint);
      const raw = totalVp > 0n ? (delegatePool * userShare) / totalVp : 0n;
      monthlyReward = raw < tier.delegateCap ? raw : (tier.delegateCap as bigint);
    } else if (role === "delegator" && totalVp > 0n) {
      userShare = userBalance;
      const delegatorPool = (tier.poolSize * (DELEGATOR_POOL_BPS as bigint)) / (BPS_BASE as bigint);
      const raw = totalVp > 0n ? (delegatorPool * userBalance) / totalVp : 0n;
      monthlyReward = raw < tier.delegatorCap ? raw : (tier.delegatorCap as bigint);
    }

    // APY: (monthlyReward * 12 / userShare) * 100
    let estimatedApyPct = "0.00";
    if (userShare > 0n && monthlyReward > 0n) {
      const apyBps = (monthlyReward * 1200n * 100n) / userShare;
      estimatedApyPct = (Number(apyBps) / 100).toFixed(2);
    }

    const qualifiesForLottery = monthlyReward > 0n && monthlyReward < (MIN_PAYOUT as bigint);

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
        estimatedApyPct,
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
