import { OpenAPIHono, createRoute, z } from "@hono/zod-openapi";
import { db } from "ponder:api";
import { POOL_TIERS } from "@ens-dis/domain";
import {
  fetchActiveDelegates,
  fetchCurrentVpGrowth,
  formatGrowthRange,
  findTierIndex,
} from "../helpers.js";

const TierSchema = z.object({
  index: z.number().openapi({ example: 0 }),
  growthRange: z.string().openapi({ example: "0-5%" }),
  poolSize: z.string().openapi({ example: "50000000000000000000000" }),
  delegateCap: z.string(),
  delegatorCap: z.string(),
  vpThreshold: z
    .string()
    .openapi({
      description: "VP needed to enter this tier (vpStart * (1 + minGrowthPct/100))",
      example: "105000000000000000000000",
    }),
});

const TiersResponse = z.object({
  vpStart: z
    .string()
    .openapi({ description: "Active VP at the start of the current round", example: "100000000000000000000000" }),
  vpCurrent: z
    .string()
    .openapi({ description: "Active VP now", example: "107230000000000000000000" }),
  currentVpGrowth: z.string().openapi({ example: "7.23" }),
  currentTier: z.number().openapi({ example: 1 }),
  tiers: z.array(TierSchema),
});

const route = createRoute({
  method: "get",
  path: "/tiers",
  tags: ["Tiers"],
  summary: "List incentive tiers",
  description:
    "Returns pool tier configuration, current VP growth state, and the VP threshold to enter each tier.",
  responses: {
    200: {
      description: "Tier configuration and current state",
      content: { "application/json": { schema: TiersResponse } },
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

    const vpStartBig = vpStart as bigint;

    const tiers = POOL_TIERS.map((tier, index) => {
      // VP needed = vpStart * (100 + minGrowthPct) / 100
      const vpThreshold =
        (vpStartBig * (100n + BigInt(tier.minGrowthPct))) / 100n;

      return {
        index,
        growthRange: formatGrowthRange(tier),
        poolSize: tier.poolSize.toString(),
        delegateCap: tier.delegateCap.toString(),
        delegatorCap: tier.delegatorCap.toString(),
        vpThreshold: vpThreshold.toString(),
      };
    });

    return c.json(
      {
        vpStart: (vpStart as bigint).toString(),
        vpCurrent: (vpEnd as bigint).toString(),
        currentVpGrowth: growthPct.toFixed(2),
        currentTier: findTierIndex(growthPct),
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
