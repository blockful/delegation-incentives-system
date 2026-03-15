import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { TierProgressionSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import {
  fetchActiveDelegates,
  fetchMonthContext,
  formatWholeEns,
  errorMessage,
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

    const currentTierPoolSize = POOL_TIERS[currentTierIndex]?.poolSize ?? POOL_TIERS[0].poolSize
    const poolSizeEns = Number(currentTierPoolSize) / Number(ONE_ENS)
    const currentAVPEns = Number(currentAVP) / Number(ONE_ENS)
    const maxDelegatorApyPct = computeMaxDelegatorApyPct(
      poolSizeEns,
      Number(DELEGATOR_POOL_BPS),
      currentAVPEns,
    )

    const tiers = POOL_TIERS.map((tier, index) => {
      const requiredAVP =
        previousAVP === 0n
          ? 0n
          : previousAVP + mulDiv(previousAVP, tier.momGrowthMinBps, 10000n)
      const additionalVPNeeded = requiredAVP > currentAVP ? requiredAVP - currentAVP : 0n

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
    return c.json({ error: errorMessage(error) }, 500)
  }
})
