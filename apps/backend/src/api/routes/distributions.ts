import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import {
  ComputeResultSchema,
  DistributionSchema,
  ErrorSchema,
  MonthParam,
} from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { distributionToCsv } from "../output/csv-writer.js"
import { distributionToJson } from "../output/json-writer.js"
import { internalError } from "../helpers.js"
import { isConfiguredRound } from "../rounds.js"
import { runDistributionPipeline } from "@ens-dis/domain"

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

const computeRoute = createRoute({
  method: "post",
  path: "/distributions/{month}/compute",
  tags: ["Distributions"],
  summary: "Trigger distribution computation for a month",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: {
      content: { "application/json": { schema: ComputeResultSchema } },
      description: "Computation result",
    },
    400: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Invalid month format",
    },
    403: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Month is not a configured round",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Computation error",
    },
  },
})

const getDistributionRoute = createRoute({
  method: "get",
  path: "/distributions/{month}",
  tags: ["Distributions"],
  summary: "Get computed distribution result (JSON)",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: {
      content: { "application/json": { schema: DistributionSchema } },
      description: "Distribution data",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not computed yet",
    },
  },
})

const getCsvRoute = createRoute({
  method: "get",
  path: "/distributions/{month}/csv",
  tags: ["Distributions"],
  summary: "Download distribution as CSV",
  request: { params: z.object({ month: MonthParam }) },
  responses: {
    200: {
      content: { "text/csv": { schema: z.string() } },
      description: "CSV file",
    },
    404: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Not computed yet",
    },
  },
})

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

distributionsRouter.openapi(computeRoute, async (c) => {
  const { month } = c.req.valid("param")
  if (!isConfiguredRound(month)) {
    return c.json({ error: `${month} is not a configured round` }, 403)
  }
  try {
    const dataSource = buildDataSource()

    // Return cached result if already computed
    const cached = await dataSource.distributions.load(month)
    if (cached) {
      return c.json(
        {
          month: cached.month,
          totalDistributed: cached.metadata.totalDistributed.toString(),
          activeDelegateCount: cached.metadata.activeDelegateCount,
          eligibleDelegatorCount: cached.metadata.eligibleDelegatorCount,
          directPayoutCount: cached.directPayouts.length,
          lotteryPoolCount: cached.lotteryPools.length,
        },
        200,
      )
    }

    const result = await runDistributionPipeline({ month, dataSource })
    await dataSource.distributions.save(month, result)
    return c.json(
      {
        month: result.month,
        totalDistributed: result.metadata.totalDistributed.toString(),
        activeDelegateCount: result.metadata.activeDelegateCount,
        eligibleDelegatorCount: result.metadata.eligibleDelegatorCount,
        directPayoutCount: result.directPayouts.length,
        lotteryPoolCount: result.lotteryPools.length,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})

distributionsRouter.openapi(getDistributionRoute, async (c) => {
  const { month } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const result = await dataSource.distributions.load(month)
    if (!result) {
      return c.json(
        { error: "Distribution not computed yet. POST to /distributions/:month/compute first" },
        404,
      )
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
    const result = await dataSource.distributions.load(month)
    if (!result) {
      return c.json({ error: "Distribution not computed yet" }, 404)
    }
    return c.text(distributionToCsv(result), 200, {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="distribution-${month}.csv"`,
    })
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
