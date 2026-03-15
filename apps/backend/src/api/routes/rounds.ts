import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { RoundInfoSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, fetchMonthContext, formatWholeEns, errorMessage } from "../helpers.js"
import { ROUND_1_START, ROUND_DURATION_DAYS, POOL_TIERS } from "@ens-dis/domain"

/**
 * Pure function: compute round info for a given moment in time.
 * Accepts `now` as a parameter for testability.
 */
export function getCurrentRound(now: Date): {
  roundNumber: number
  startDate: Date
  endDate: Date
  percentComplete: number
  daysRemaining: number
} {
  const msPerDay = 24 * 60 * 60 * 1000
  const roundDurationMs = ROUND_DURATION_DAYS * msPerDay

  const elapsed = now.getTime() - ROUND_1_START.getTime()
  // Guard against dates before program launch — treat as round 1, 0% complete
  const safeElapsed = Math.max(0, elapsed)

  const roundIndex = Math.floor(safeElapsed / roundDurationMs) // 0-based
  const roundNumber = roundIndex + 1
  const startDate = new Date(ROUND_1_START.getTime() + roundIndex * roundDurationMs)
  const endDate = new Date(startDate.getTime() + roundDurationMs)

  const msIntoRound = now.getTime() - startDate.getTime()
  const percentComplete = Math.min(100, Math.max(0, Math.round((msIntoRound / roundDurationMs) * 100)))
  const msRemaining = Math.max(0, endDate.getTime() - now.getTime())
  const daysRemaining = Math.ceil(msRemaining / msPerDay)

  return { roundNumber, startDate, endDate, percentComplete, daysRemaining }
}

const currentRoundRoute = createRoute({
  method: "get",
  path: "/rounds/current",
  tags: ["Rounds"],
  summary: "Get current round info including dates, progress, and pool tier",
  responses: {
    200: {
      content: { "application/json": { schema: RoundInfoSchema } },
      description: "Current round information",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

export const roundsRouter = new OpenAPIHono()

roundsRouter.openapi(currentRoundRoute, async (c) => {
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeDelegateArray = Array.from(activeDelegates)
    const { currentTierIndex } = await fetchMonthContext(dataSource, activeDelegateArray)

    const currentTierPoolSize = POOL_TIERS[currentTierIndex]?.poolSize ?? POOL_TIERS[0].poolSize
    const poolSizeEns = formatWholeEns(currentTierPoolSize)

    const { roundNumber, startDate, endDate, percentComplete, daysRemaining } = getCurrentRound(new Date())

    return c.json(
      {
        roundNumber,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        percentComplete,
        daysRemaining,
        poolSizeEns,
        tierIndex: currentTierIndex,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 500)
  }
})
