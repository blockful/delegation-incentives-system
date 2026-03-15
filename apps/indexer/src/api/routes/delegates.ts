import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { ActiveDelegatesSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, errorMessage } from "../helpers.js"

const activeDelegatesRoute = createRoute({
  method: "get",
  path: "/delegates/active",
  tags: ["Delegates"],
  summary: "List current active delegates",
  responses: {
    200: {
      content: { "application/json": { schema: ActiveDelegatesSchema } },
      description: "Active delegates",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

export const delegatesRouter = new OpenAPIHono()

delegatesRouter.openapi(activeDelegatesRoute, async (c) => {
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    return c.json({ count: activeDelegates.size, delegates: Array.from(activeDelegates) }, 200)
  } catch (error) {
    return c.json({ error: errorMessage(error) }, 500)
  }
})
