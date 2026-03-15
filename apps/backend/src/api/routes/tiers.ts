import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { TierProgressionSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import {
  fetchActiveDelegates,
  fetchMonthContext,
  formatWholeEns,
  internalError,
  computeMaxDelegatorApyPct,
} from "../helpers.js"
import { POOL_TIERS, percentageGrowthBps, mulDiv, DELEGATOR_POOL_BPS, ONE_ENS } from "@ens-dis/domain"

const tierProgressionRoute = createRoute({
  method: "get",
  path: "/tiers/progression",
  tags: ["Tiers"],
  summary: "Get current tier and VP needed for each higher tier",
  responses: {
    200: {
      content: { "application/json": { schema: TierProgressionSchema } },
      description: "Tier progression",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

export const tiersRouter = new OpenAPIHono()

tiersRouter.openapi(tierProgressionRoute, async (c) => {
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeDelegateArray = Array.from(activeDelegates)
    const { currentAVP, previousAVP, currentTierIndex } = await fetchMonthContext(
      dataSource,
      activeDelegateArray,
    )

    const growthBps = percentageGrowthBps(currentAVP, previousAVP)

    // maxDelegatorApyPct uses the current tier pool and current AVP
    const currentTierPoolSize = POOL_TIERS[currentTierIndex]?.poolSize ?? POOL_TIERS[0].poolSize
    const currentPoolEns = Number(currentTierPoolSize) / Number(ONE_ENS)
    const currentAVPEns = Number(currentAVP) / Number(ONE_ENS)
    const maxDelegatorApyPct = computeMaxDelegatorApyPct(
      currentPoolEns,
      Number(DELEGATOR_POOL_BPS),
      currentAVPEns,
    )

    const delegatorPoolBps = Number(DELEGATOR_POOL_BPS)
    const previousAVPEns = Number(previousAVP) / Number(ONE_ENS)

    const tiers = POOL_TIERS.map((tier, index) => {
      const requiredAVP =
        previousAVP === 0n
          ? 0n
          : previousAVP + mulDiv(previousAVP, tier.momGrowthMinBps, 10000n)
      const additionalVPNeeded = requiredAVP > currentAVP ? requiredAVP - currentAVP : 0n

      // Estimate APY based on initial VP of the round (previousAVP).
      // For each tier, VP would have grown by tier.momGrowthMinBps from previousAVP.
      let estimatedApyPct = "0.00"
      if (previousAVPEns > 0) {
        const tierPoolEns = Number(tier.poolSize) / Number(ONE_ENS)
        const tierGrowthRatio = 1 + Number(tier.momGrowthMinBps) / 10000
        const estimatedVPEns = previousAVPEns * tierGrowthRatio
        estimatedApyPct = computeMaxDelegatorApyPct(tierPoolEns, delegatorPoolBps, estimatedVPEns)
      }

      return {
        index,
        momGrowthMinPct: `${Number(tier.momGrowthMinBps) / 100}`,
        momGrowthMaxPct: `${Number(tier.momGrowthMaxBps) / 100}`,
        poolSizeEns: formatWholeEns(tier.poolSize),
        delegateCapEns: formatWholeEns(tier.delegateCap),
        delegatorCapEns: formatWholeEns(tier.delegatorCap),
        isCurrent: index === currentTierIndex,
        isUnlocked: growthBps >= tier.momGrowthMinBps,
        additionalVPNeeded: additionalVPNeeded.toString(),
        requiredAVP: requiredAVP.toString(),
        estimatedApyPct,
      }
    })

    return c.json(
      {
        currentAVP: currentAVP.toString(),
        previousAVP: previousAVP.toString(),
        currentGrowthBps: growthBps.toString(),
        currentGrowthPct: `${Number(growthBps) / 100}`,
        currentTierIndex,
        activeDelegateCount: activeDelegates.size,
        maxDelegatorApyPct,
        tiers,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
