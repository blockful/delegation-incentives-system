import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
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

const AddressParam = z.object({
  address: z
    .string()
    .openapi({ param: { name: "address", in: "path" }, example: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045" }),
});

const TierApySchema = z.object({
  growthRange: z.string().openapi({ example: "0-5%" }),
  poolSize: z.string().openapi({ example: "50000000000000000000000" }),
  delegateCap: z.string(),
  delegatorCap: z.string(),
  estimatedApy: z.string().openapi({ example: "12.50" }),
});

const ApyResponse = z.object({
  currentTierApy: z.string().openapi({ example: "15.33" }),
  tiers: z.array(TierApySchema),
});

const route = createRoute({
  method: "get",
  path: "/apy/{address}",
  tags: ["APY"],
  summary: "Estimate APY for an address",
  description:
    "Calculates estimated annualized yield for each tier. Uses voting power for delegates and token balance for delegators.",
  request: { params: AddressParam },
  responses: {
    200: {
      description: "APY estimates per tier",
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
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    const isDelegate = activeDelegates.has(address as Address);

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

    const tiers = POOL_TIERS.map((tier) => {
      let estimatedApy = "0";

      if (stake > 0n && totalVp > 0n) {
        const poolBps = isDelegate ? DELEGATE_POOL_BPS : DELEGATOR_POOL_BPS;
        const pool = (tier.poolSize * poolBps) / BPS_BASE;
        const monthlyReward = (pool * stake) / totalVp;

        const cap = isDelegate ? tier.delegateCap : tier.delegatorCap;
        const cappedReward = monthlyReward < cap ? monthlyReward : cap;

        const apyBps = (cappedReward * 1200n * 100n) / stake;
        estimatedApy = (Number(apyBps) / 100).toFixed(2);
      }

      return {
        growthRange: formatGrowthRange(tier),
        poolSize: tier.poolSize.toString(),
        delegateCap: tier.delegateCap.toString(),
        delegatorCap: tier.delegatorCap.toString(),
        estimatedApy,
      };
    });

    return c.json(
      { currentTierApy: tiers[currentTierIndex]?.estimatedApy ?? "0", tiers },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
