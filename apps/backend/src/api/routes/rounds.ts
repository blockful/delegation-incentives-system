import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { RoundInfoSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, fetchMonthContext, formatWholeEns, internalError } from "../helpers.js"
import { getConfiguredRounds } from "../rounds.js"
import { POOL_TIERS } from "@ens-dis/domain"

/**
 * Pure function: compute round info for a given moment in time.
 * Uses ROUND_MONTHS from .env when configured (each month = one round),
 * with start/end dates derived from calendar month boundaries.
 */
export function getCurrentRound(
  now: Date,
  configuredMonths: string[] | null = getConfiguredRounds(),
): {
  roundNumber: number
  startDate: Date
  endDate: Date
  percentComplete: number
  daysRemaining: number
} {
  const msPerDay = 24 * 60 * 60 * 1000

  if (configuredMonths && configuredMonths.length > 0) {
    // Find which configured month we're in (or the closest one)
    const nowMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`
    let roundIndex = configuredMonths.indexOf(nowMonth)

    // If current month isn't configured, find the latest past round or first future round
    if (roundIndex === -1) {
      roundIndex = configuredMonths.findIndex((m) => m >= nowMonth)
      if (roundIndex === -1) roundIndex = configuredMonths.length - 1
    }

    const month = configuredMonths[roundIndex]
    const [year, mon] = month.split("-").map(Number)
    const startDate = new Date(Date.UTC(year, mon - 1, 1))
    const endDate = new Date(Date.UTC(year, mon, 1)) // first day of next month

    const totalMs = endDate.getTime() - startDate.getTime()
    const elapsedMs = Math.max(0, now.getTime() - startDate.getTime())
    const percentComplete = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)))
    const msRemaining = Math.max(0, endDate.getTime() - now.getTime())
    const daysRemaining = Math.ceil(msRemaining / msPerDay)

    return {
      roundNumber: roundIndex + 1,
      startDate,
      endDate,
      percentComplete,
      daysRemaining,
    }
  }

  // Fallback: no configured months — return round 1 at 0%
  return {
    roundNumber: 1,
    startDate: now,
    endDate: now,
    percentComplete: 0,
    daysRemaining: 0,
  }
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
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeDelegateArray = Array.from(activeDelegates)
    const { currentTierIndex } = await fetchMonthContext(dataSource, activeDelegateArray)

    const currentTierPoolSize = POOL_TIERS[currentTierIndex]?.poolSize ?? POOL_TIERS[0].poolSize
    const poolSizeEns = formatWholeEns(currentTierPoolSize)

    const { roundNumber, startDate, endDate, percentComplete, daysRemaining } = getCurrentRound(new Date(), getConfiguredRounds())

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
