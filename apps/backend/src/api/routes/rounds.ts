import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { RoundInfoSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, fetchMonthContext, formatWholeEns, internalError } from "../helpers.js"
import { getConfiguredRounds } from "../rounds.js"
import { POOL_TIERS } from "@ens-dis/domain"

/**
 * Pure function: compute round info for a given moment in time.
 * Rounds are calendar months defined by the sorted `rounds` array (YYYY-MM strings).
 * - If `now` falls inside a configured month, that month is active.
 * - If `now` is before all rounds, the first round is returned (0% complete).
 * - If `now` is after all rounds, the last round is returned (100% complete).
 * Returns null when `rounds` is empty.
 */
export function getCurrentRound(
  now: Date,
  rounds: string[],
): {
  roundNumber: number
  month: string
  startDate: Date
  endDate: Date
  percentComplete: number
  daysRemaining: number
} | null {
  if (rounds.length === 0) return null

  const sorted = [...rounds].sort()
  const msPerDay = 24 * 60 * 60 * 1000

  // Find the active or next upcoming round
  let activeIndex = -1
  for (let i = 0; i < sorted.length; i++) {
    const [y, m] = sorted[i].split("-").map(Number)
    const start = new Date(Date.UTC(y, m - 1, 1))
    const end = new Date(Date.UTC(y, m, 1))
    if (now >= start && now < end) {
      activeIndex = i
      break
    }
    // now is before this round's start — use it as the upcoming round
    if (now < start && activeIndex === -1) {
      activeIndex = i
      break
    }
  }

  // Past all rounds — use the last one
  if (activeIndex === -1) activeIndex = sorted.length - 1

  const month = sorted[activeIndex]
  const [year, monthNum] = month.split("-").map(Number)
  const startDate = new Date(Date.UTC(year, monthNum - 1, 1))
  const endDate = new Date(Date.UTC(year, monthNum, 1))
  const roundDurationMs = endDate.getTime() - startDate.getTime()

  const msIntoRound = now.getTime() - startDate.getTime()
  const percentComplete = Math.min(100, Math.max(0, Math.floor((msIntoRound / roundDurationMs) * 100)))
  // When now is before the round starts (upcoming round), cap remaining to the full month duration
  const msRemaining = now < startDate
    ? roundDurationMs
    : Math.max(0, endDate.getTime() - now.getTime())
  const daysRemaining = Math.ceil(msRemaining / msPerDay)

  return { roundNumber: activeIndex + 1, month, startDate, endDate, percentComplete, daysRemaining }
}

const RoundSchema = z.object({
  month: z.string(),
  status: z.enum(["pending", "computed"]),
}).openapi("Round")

const RoundsSchema = z.object({
  configured: z.boolean().openapi({ description: "false when ROUND_MONTHS is not set" }),
  rounds: z.array(RoundSchema),
}).openapi("Rounds")

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
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "No rounds configured",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

const getRoundsRoute = createRoute({
  method: "get",
  path: "/rounds",
  tags: ["Rounds"],
  summary: "List configured rounds and their computation status",
  responses: {
    200: {
      content: { "application/json": { schema: RoundsSchema } },
      description: "Round list",
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
    const configuredMonths = getConfiguredRounds()
    if (configuredMonths === null) {
      return c.json({ error: "No rounds configured. Set ROUND_MONTHS in environment." }, 404)
    }

    const roundInfo = getCurrentRound(new Date(), configuredMonths)
    if (!roundInfo) {
      return c.json({ error: "No rounds configured." }, 404)
    }

    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeDelegateArray = Array.from(activeDelegates)
    const { currentTierIndex } = await fetchMonthContext(dataSource, activeDelegateArray)

    const currentTierPoolSize = POOL_TIERS[currentTierIndex]?.poolSize ?? POOL_TIERS[0].poolSize
    const poolSizeEns = formatWholeEns(currentTierPoolSize)

    return c.json(
      {
        roundNumber: roundInfo.roundNumber,
        month: roundInfo.month,
        startDate: roundInfo.startDate.toISOString(),
        endDate: roundInfo.endDate.toISOString(),
        percentComplete: roundInfo.percentComplete,
        daysRemaining: roundInfo.daysRemaining,
        poolSizeEns,
        tierIndex: currentTierIndex,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})

roundsRouter.openapi(getRoundsRoute, async (c) => {
  try {
    const configuredMonths = getConfiguredRounds()

    if (configuredMonths === null) {
      return c.json({ configured: false, rounds: [] }, 200)
    }

    const dataSource = buildDataSource()
    const computed = new Set(await dataSource.distributions.list())

    const rounds = configuredMonths.map((month) => ({
      month,
      status: computed.has(month) ? ("computed" as const) : ("pending" as const),
    }))

    return c.json({ configured: true, rounds }, 200)
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
