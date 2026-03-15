import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { HealthSchema, StatusSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, errorMessage } from "../helpers.js"

const healthRoute = createRoute({
  method: "get",
  path: "/health",
  tags: ["System"],
  summary: "Health check",
  responses: {
    200: {
      content: { "application/json": { schema: HealthSchema } },
      description: "OK",
    },
  },
})

const statusRoute = createRoute({
  method: "get",
  path: "/status",
  tags: ["System"],
  summary: "Get system status",
  responses: {
    200: {
      content: { "application/json": { schema: StatusSchema } },
      description: "System status",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

export const healthRouter = new OpenAPIHono()

healthRouter.openapi(healthRoute, (c) => c.json({ status: "ok" as const }, 200))

healthRouter.openapi(statusRoute, async (c) => {
  try {
    const dataSource = buildDataSource()
    const { proposals, activeDelegates } = await fetchActiveDelegates(dataSource)
    const cachedDistributions = await dataSource.distributions.list()
    return c.json(
      {
        activeDelegateCount: activeDelegates.size,
        proposalCount: proposals.length,
        cachedDistributions,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 500)
  }
})
