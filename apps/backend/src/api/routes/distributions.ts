import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import {
  DistributionSchema,
  ErrorSchema,
  MonthParam,
} from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { distributionToCsv } from "../output/csv-writer.js"
import { distributionToJson } from "../output/json-writer.js"
import { internalError } from "../helpers.js"
import { isConfiguredRound } from "../rounds.js"
import { runDistributionPipeline, type DistributionResult } from "@ens-dis/domain"

// ─── In-flight deduplication ─────────────────────────────────────────────────
// Prevents multiple concurrent requests from triggering parallel computations
// for the same month. Once the promise settles it is removed; future requests
// then hit the DB cache.

const inFlight = new Map<string, Promise<DistributionResult>>()

/** Returns true when the calendar month has fully elapsed (UTC). */
export function isMonthOver(month: string): boolean {
  const [y, m] = month.split("-").map(Number)
  return Date.now() >= Date.UTC(y, m, 1) // first ms of the following month
}

async function computeAndCache(
  month: string,
  dataSource: ReturnType<typeof buildDataSource>,
): Promise<DistributionResult> {
  const result = await runDistributionPipeline({ month, dataSource })
  await dataSource.distributions.save(month, result)
  return result
}

/**
 * Loads a distribution from cache, or triggers computation on first access
 * after month end. Concurrent requests share the same in-flight promise so
 * the pipeline runs at most once per month regardless of concurrency.
 *
 * Returns null when the month hasn't ended or isn't a configured round.
 */
async function getOrCompute(
  month: string,
  dataSource: ReturnType<typeof buildDataSource>,
): Promise<DistributionResult | null> {
  const cached = await dataSource.distributions.load(month)
  if (cached) return cached

  if (!isMonthOver(month) || !isConfiguredRound(month)) return null

  let promise = inFlight.get(month)
  if (!promise) {
    promise = computeAndCache(month, dataSource).finally(() => inFlight.delete(month))
    inFlight.set(month, promise)
  }
  return promise
}

// ─── Routes ──────────────────────────────────────────────────────────────────

const listDistributionsRoute = createRoute({
  method: "get",
  path: "/distributions",
  tags: ["Distributions"],
  summary: "List all computed distribution months",
  responses: {
    200: {
      content: { "application/json": { schema: z.array(z.string()) } },
      description: "List of computed months",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

const getDistributionRoute = createRoute({
  method: "get",
  path: "/distributions/{month}",
  tags: ["Distributions"],
  summary: "Get distribution result for a month (auto-computes on first access after month end)",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: {
      content: { "application/json": { schema: DistributionSchema } },
      description: "Distribution data",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Month has not ended or is not a configured round",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Computation or retrieval error",
    },
  },
})

const getCsvRoute = createRoute({
  method: "get",
  path: "/distributions/{month}/csv",
  tags: ["Distributions"],
  summary: "Download distribution as CSV (auto-computes on first access after month end)",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: {
      content: { "text/csv": { schema: z.string() } },
      description: "CSV file",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Month has not ended or is not a configured round",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

// ─── Handlers ─────────────────────────────────────────────────────────────────

export const distributionsRouter = new OpenAPIHono()

distributionsRouter.openapi(listDistributionsRoute, async (c) => {
  try {
    const dataSource = buildDataSource()
    const months = await dataSource.distributions.list()
    return c.json(months, 200)
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})

distributionsRouter.openapi(getDistributionRoute, async (c) => {
  const { month } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const result = await getOrCompute(month, dataSource)
    if (!result) {
      return c.json({ error: `Distribution for ${month} is not available yet` }, 404)
    }
    return c.json(JSON.parse(distributionToJson(result)), 200)
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})

distributionsRouter.openapi(getCsvRoute, async (c) => {
  const { month } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const result = await getOrCompute(month, dataSource)
    if (!result) {
      return c.json({ error: `Distribution for ${month} is not available yet` }, 404)
    }
    return c.text(distributionToCsv(result), 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="distribution-${month}.csv"`,
    })
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
