import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import {
  POOL_TIERS,
  computeTierAprPct,
  wei,
} from "@ens-dis/domain";
import {
  fetchCurrentGrowth,
  formatEns,
  findTierIndex,
} from "../helpers.js";

const TierEntrySchema = z.object({
  index: z.number().openapi({ example: 0 }),
  momGrowthMinPct: z.string().openapi({ example: "0" }),
  momGrowthMaxPct: z.string().openapi({ example: "10" }),
  poolSizeEns: z.string().openapi({ example: "5000.000000000000000000" }),
  voterCapEns: z.string().openapi({ example: "50.000000000000000000" }),
  tokenHolderCapEns: z.string().openapi({ example: "250.000000000000000000" }),
  isCurrent: z.boolean(),
  isUnlocked: z.boolean(),
  additionalVPNeeded: z.string().openapi({ description: "Wei needed above current VP to reach this tier", example: "0" }),
  requiredTotalVP: z.string().openapi({ description: "VP threshold to enter this tier (wei)", example: "110000000000000000000000" }),
  estimatedAprPct: z.string().openapi({ description: "Estimated token-holder APR at this tier (calibrated against round-start VP)", example: "12.50" }),
});

const TierProgressionResponse = z.object({
  currentTotalVP: z.string().openapi({ description: "Current total VP held by active voters (wei)", example: "107230000000000000000000" }),
  previousTotalVP: z.string().openapi({ description: "Total VP of the month-start active-voter set at month start (wei)", example: "100000000000000000000000" }),
  currentGrowthBps: z.string().openapi({ example: "723" }),
  currentGrowthPct: z.string().openapi({ example: "7.23" }),
  currentTierIndex: z.number().openapi({ example: 0 }),
  activeVoterCount: z.number().openapi({ example: 25 }),
  maxTokenHolderAprPct: z.string().openapi({ description: "Highest estimated token-holder APR across all tiers", example: "54.00" }),
  degraded: z.boolean().openapi({ description: "True while the month-start boundary block is not finalized yet (shortly after month rollover) and growth temporarily uses the current voter set on both boundaries." }),
  tiers: z.array(TierEntrySchema),
});

const route = createRoute({
  method: "get",
  path: "/tiers/progression",
  tags: ["Tiers"],
  summary: "Tier progression and current VP growth",
  description:
    "Returns all tier definitions with current unlock state, VP thresholds, estimated APR, and overall VP growth.",
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
    const { activeVoters, vpStart, vpEnd, growthPct, degraded } =
      await fetchCurrentGrowth(db);

    const vpStartBig = vpStart as bigint;
    const vpEndBig = vpEnd as bigint;
    const currentTierIndex = findTierIndex(growthPct);
    const growthBps = Math.round(growthPct * 100);

    let maxTokenHolderApr = 0;

    const tiers = POOL_TIERS.map((tier, index) => {
      const requiredTotalVP =
        (vpStartBig * (100n + BigInt(tier.minGrowthPct))) / 100n;

      // An unlocked tier is already reached; only locked tiers need more VP
      // (under negative growth requiredTotalVP can exceed vpEnd for tier 0).
      const diff = requiredTotalVP - vpEndBig;
      const additionalVPNeeded =
        index <= currentTierIndex ? 0n : diff > 0n ? diff : 0n;

      const estimatedAprPct = computeTierAprPct(tier, wei(vpStartBig));

      const aprNum = parseFloat(estimatedAprPct);
      if (aprNum > maxTokenHolderApr) maxTokenHolderApr = aprNum;

      return {
        index,
        momGrowthMinPct: tier.minGrowthPct.toString(),
        momGrowthMaxPct: tier.maxGrowthPct === Infinity ? "Infinity" : tier.maxGrowthPct.toString(),
        poolSizeEns: formatEns(tier.poolSize as bigint),
        voterCapEns: formatEns(tier.voterCap as bigint),
        tokenHolderCapEns: formatEns(tier.tokenHolderCap as bigint),
        isCurrent: index === currentTierIndex,
        isUnlocked: index <= currentTierIndex,
        additionalVPNeeded: additionalVPNeeded.toString(),
        requiredTotalVP: requiredTotalVP.toString(),
        estimatedAprPct,
      };
    });

    return c.json(
      {
        currentTotalVP: vpEndBig.toString(),
        previousTotalVP: vpStartBig.toString(),
        currentGrowthBps: growthBps.toString(),
        currentGrowthPct: growthPct.toFixed(2),
        currentTierIndex,
        activeVoterCount: activeVoters.size,
        maxTokenHolderAprPct: maxTokenHolderApr.toFixed(2),
        degraded,
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
