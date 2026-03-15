import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { EligibilitySchema, ErrorSchema, AddressParam } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, toLowerSet, internalError } from "../helpers.js"

const eligibilityRoute = createRoute({
  method: "get",
  path: "/eligibility/{address}",
  tags: ["Eligibility"],
  summary: "Check reward eligibility for an address",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: {
      content: { "application/json": { schema: EligibilitySchema } },
      description: "Eligibility status",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

export const eligibilityRouter = new OpenAPIHono()

eligibilityRouter.openapi(eligibilityRoute, async (c) => {
  const { address } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeLower = toLowerSet(activeDelegates)
    const isActiveDelegate = activeLower.has(address.toLowerCase())

    const accountBalances = await dataSource.delegations.getAccountBalances()
    const accountBalance = accountBalances.find(
      (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
    )
    const isDelegatorToActive =
      accountBalance !== undefined && activeLower.has(accountBalance.delegate.toLowerCase())

    return c.json(
      {
        address,
        isActiveDelegate,
        isDelegatorToActiveDelegate: isDelegatorToActive,
        eligible: isActiveDelegate || isDelegatorToActive,
        delegatedTo: accountBalance?.delegate ?? null,
      },
      200,
    )
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
