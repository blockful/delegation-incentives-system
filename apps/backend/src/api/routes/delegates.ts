import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { ActiveDelegatesDetailSchema, ErrorSchema } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import { fetchActiveDelegates, internalError } from "../helpers.js"

const activeDelegatesRoute = createRoute({
  method: "get",
  path: "/delegates/active",
  tags: ["Delegates"],
  summary: "List current active delegates",
  responses: {
    200: {
      content: { "application/json": { schema: ActiveDelegatesDetailSchema } },
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
    const { proposals, votes, activeDelegates } = await fetchActiveDelegates(dataSource)
    const delegateAddresses = Array.from(activeDelegates)

    // Fetch voting power and delegations in parallel
    const now = Math.floor(Date.now() / 1000)
    const [votingPowerMap, delegations] = await Promise.all([
      dataSource.votingPower.getVotingPower(delegateAddresses),
      dataSource.delegations.getActiveDelegations(delegateAddresses, now),
    ])

    // Count delegators per delegate (keys are lowercased to match adapter output)
    const delegatorCountMap = new Map<string, number>()
    for (const d of delegations) {
      const key = d.delegateId.toLowerCase()
      delegatorCountMap.set(key, (delegatorCountMap.get(key) ?? 0) + 1)
    }

    // Build vote lookup: voterAccountId -> Set<proposalId>
    const votesByVoter = new Map<string, Set<string>>()
    for (const vote of votes) {
      const set = votesByVoter.get(vote.voterAccountId) ?? new Set<string>()
      set.add(vote.proposalId)
      votesByVoter.set(vote.voterAccountId, set)
    }

    // Take last 10 proposals (already ordered by fetchActiveDelegates)
    const last10 = proposals.slice(-10)

    const delegates = delegateAddresses.map((address) => {
      // Adapters normalize addresses to lowercase; voter IDs from active-delegate
      // detection may be mixed-case, so we must lowercase for map lookups.
      const lc = address.toLowerCase()
      const vp = votingPowerMap.get(lc)
      const voterSet = votesByVoter.get(address)
      return {
        address,
        ensName: null,
        votingPower: vp != null ? vp.toString() : null,
        delegatorCount: delegatorCountMap.get(lc) ?? 0,
        activeSince: null,
        last10ProposalsVoted: last10.map((p) => voterSet?.has(p.id) ?? false),
      }
    })

    return c.json({ count: delegates.length, delegates }, 200)
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
