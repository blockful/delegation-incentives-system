import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import {
  POOL_TIERS,
  DELEGATOR_POOL_BPS,
  BPS_BASE,
} from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  formatEns,
  findTierIndex,
  getActiveVpTotal,
} from "../helpers.js";

const TierEntrySchema = z.object({
  index: z.number().openapi({ example: 0 }),
  momGrowthMinPct: z.string().openapi({ example: "0" }),
  momGrowthMaxPct: z.string().openapi({ example: "10" }),
  poolSizeEns: z.string().openapi({ example: "5000.000000000000000000" }),
  delegateCapEns: z.string().openapi({ example: "50.000000000000000000" }),
  delegatorCapEns: z.string().openapi({ example: "250.000000000000000000" }),
  isCurrent: z.boolean(),
  isUnlocked: z.boolean(),
  additionalVPNeeded: z.string().openapi({ description: "Wei needed above current VP to reach this tier", example: "0" }),
  requiredAVP: z.string().openapi({ description: "VP threshold to enter this tier (wei)", example: "110000000000000000000000" }),
  estimatedApyPct: z.string().openapi({ description: "Estimated delegator APY at this tier", example: "12.50" }),
});

const TierProgressionResponse = z.object({
  currentAVP: z.string().openapi({ description: "Current active VP (wei)", example: "107230000000000000000000" }),
  previousAVP: z.string().openapi({ description: "Active VP at month start (wei)", example: "100000000000000000000000" }),
  currentGrowthBps: z.string().openapi({ example: "723" }),
  currentGrowthPct: z.string().openapi({ example: "7.23" }),
  currentTierIndex: z.number().openapi({ example: 0 }),
  activeDelegateCount: z.number().openapi({ example: 25 }),
  maxDelegatorApyPct: z.string().openapi({ description: "Highest estimated delegator APY across all tiers", example: "54.00" }),
  tiers: z.array(TierEntrySchema),
});

const route = createRoute({
  method: "get",
  path: "/tiers/progression",
  tags: ["Tiers"],
  summary: "Tier progression and current VP growth",
  description:
    "Returns all tier definitions with current unlock state, VP thresholds, estimated APY, and overall VP growth.",
  responses: {
    200: {
      description: "Tier progression data",
      content: { "application/json": { schema: TierProgressionResponse } },
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
    const { activeDelegates } = await fetchActiveDelegates(db);
    const { vpStart, vpEnd, growthPct } = await fetchCurrentVpGrowth(
      db,
      activeDelegates,
      activeDelegates,
    );
    const totalVp = await getActiveVpTotal(db, activeDelegates);

    const vpStartBig = vpStart as bigint;
    const vpEndBig = vpEnd as bigint;
    const currentTierIndex = findTierIndex(growthPct);
    const growthBps = Math.round(growthPct * 100);

    let maxDelegatorApy = 0;

    const tiers = POOL_TIERS.map((tier, index) => {
      const requiredAVP =
        (vpStartBig * (100n + BigInt(tier.minGrowthPct))) / 100n;

      const diff = requiredAVP - vpEndBig;
      const additionalVPNeeded = diff > 0n ? diff : 0n;

      // Estimated delegator APY: (delegatorPool * 12 / totalVP) * 100
      let estimatedApyPct = "0.00";
      if (totalVp > 0n) {
        const delegatorPool = (tier.poolSize * (DELEGATOR_POOL_BPS as bigint)) / (BPS_BASE as bigint);
        // APY in basis points: delegatorPool * 12 * 10000 / totalVp
        const apyBps = (delegatorPool * 1200n * 100n) / totalVp;
        estimatedApyPct = (Number(apyBps) / 100).toFixed(2);
      }

      const apyNum = parseFloat(estimatedApyPct);
      if (apyNum > maxDelegatorApy) maxDelegatorApy = apyNum;

      return {
        index,
        momGrowthMinPct: tier.minGrowthPct.toString(),
        momGrowthMaxPct: tier.maxGrowthPct === Infinity ? "Infinity" : tier.maxGrowthPct.toString(),
        poolSizeEns: formatEns(tier.poolSize as bigint),
        delegateCapEns: formatEns(tier.delegateCap as bigint),
        delegatorCapEns: formatEns(tier.delegatorCap as bigint),
        isCurrent: index === currentTierIndex,
        isUnlocked: index <= currentTierIndex,
        additionalVPNeeded: additionalVPNeeded.toString(),
        requiredAVP: requiredAVP.toString(),
        estimatedApyPct,
      };
    });

    return c.json(
      {
        currentAVP: vpEndBig.toString(),
        previousAVP: vpStartBig.toString(),
        currentGrowthBps: growthBps.toString(),
        currentGrowthPct: growthPct.toFixed(2),
        currentTierIndex,
        activeDelegateCount: activeDelegates.size,
        maxDelegatorApyPct: maxDelegatorApy.toFixed(2),
        tiers,
      },
      200,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return c.json({ error: message }, 500);
  }
});

export default app;
