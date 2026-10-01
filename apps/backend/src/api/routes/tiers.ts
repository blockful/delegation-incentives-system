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
  type CurrentGrowth,
} from "../helpers.js";
import { isProgramEnded } from "../round-config.js";

const TierEntrySchema = z.object({
  index: z.number().openapi({ example: 0 }),
  momGrowthMinPct: z.string().openapi({ example: "0" }),
  momGrowthMaxPct: z.string().openapi({ example: "10" }),
  poolSizeEns: z.string().openapi({ example: "5000.000000000000000000" }),
  voterCapEns: z.string().openapi({ example: "50.000000000000000000" }),
  tokenHolderCapEns: z.string().openapi({ example: "250.000000000000000000" }),
  isCurrent: z.boolean().openapi({ description: "False for every tier once the program has ended" }),
  isUnlocked: z.boolean().openapi({ description: "False for every tier once the program has ended" }),
  additionalVPNeeded: z.string().nullable().openapi({ description: "Wei needed above current VP to reach this tier. Null once the program has ended.", example: "0" }),
  requiredTotalVP: z.string().nullable().openapi({ description: "VP threshold to enter this tier (wei). Null once the program has ended.", example: "110000000000000000000000" }),
  estimatedAprPct: z.string().nullable().openapi({ description: "Estimated token-holder APR at this tier (calibrated against round-start VP). Null once the program has ended.", example: "12.50" }),
});

// Every "current" field is a projection of the running month; once the
// program has ended there is no round to project, so they are null.
const TierProgressionResponse = z.object({
  currentTotalVP: z.string().nullable().openapi({ description: "Current total VP held by active voters (wei). Null once the program has ended.", example: "107230000000000000000000" }),
  previousTotalVP: z.string().nullable().openapi({ description: "Total VP of the month-start active-voter set at month start (wei). Null once the program has ended.", example: "100000000000000000000000" }),
  currentGrowthBps: z.string().nullable().openapi({ example: "723" }),
  currentGrowthPct: z.string().nullable().openapi({ example: "7.23" }),
  currentTierIndex: z.number().nullable().openapi({ description: "Null once the program has ended", example: 0 }),
  activeVoterCount: z.number().nullable().openapi({ example: 25 }),
  maxTokenHolderAprPct: z.string().nullable().openapi({ description: "Highest estimated token-holder APR across all tiers. Null once the program has ended.", example: "54.00" }),
  degraded: z.boolean().openapi({ description: "True while the month-start boundary block is not finalized yet (shortly after month rollover) and growth temporarily uses the current voter set on both boundaries." }),
  programEnded: z.boolean().openapi({ description: "True once the last configured round has ended", example: false }),
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

export interface TiersRouteDeps {
  getGrowth?: () => Promise<CurrentGrowth>;
  now?: () => Date;
}

/** Static tier definitions, without any growth-dependent field. */
function tierDefinition(tier: (typeof POOL_TIERS)[number], index: number) {
  return {
    index,
    momGrowthMinPct: tier.minGrowthPct.toString(),
    momGrowthMaxPct: tier.maxGrowthPct === Infinity ? "Infinity" : tier.maxGrowthPct.toString(),
    poolSizeEns: formatEns(tier.poolSize as bigint),
    voterCapEns: formatEns(tier.voterCap as bigint),
    tokenHolderCapEns: formatEns(tier.tokenHolderCap as bigint),
  };
}

export function createTiersApp(deps: TiersRouteDeps = {}) {
  const app = new OpenAPIHono();
  const getGrowth = deps.getGrowth ?? (() => fetchCurrentGrowth(db));
  const getNow = deps.now ?? (() => new Date());

  app.openapi(route, async (c) => {
    try {
      if (isProgramEnded(getNow())) {
        return c.json(
          {
            currentTotalVP: null,
            previousTotalVP: null,
            currentGrowthBps: null,
            currentGrowthPct: null,
            currentTierIndex: null,
            activeVoterCount: null,
            maxTokenHolderAprPct: null,
            degraded: false,
            programEnded: true,
            tiers: POOL_TIERS.map((tier, index) => ({
              ...tierDefinition(tier, index),
              isCurrent: false,
              isUnlocked: false,
              additionalVPNeeded: null,
              requiredTotalVP: null,
              estimatedAprPct: null,
            })),
          },
          200,
        );
      }

      const { activeVoters, vpStart, vpEnd, growthPct, degraded } =
        await getGrowth();

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
          ...tierDefinition(tier, index),
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
          programEnded: false,
          tiers,
        },
        200,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return c.json({ error: message }, 500);
    }
  });

  return app;
}

export default createTiersApp();
