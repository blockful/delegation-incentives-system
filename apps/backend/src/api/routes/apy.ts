import { OpenAPIHono, createRoute } from "@hono/zod-openapi"
import { z } from "zod"
import { ApyEstimateSchema, ErrorSchema, AddressParam } from "../schemas.js"
import { buildDataSource } from "../data-source.js"
import {
  fetchActiveDelegates,
  fetchMonthContext,
  toLowerSet,
  computeApyPct,
  formatEns,
  formatWholeEns,
  internalError,
} from "../helpers.js"
import {
  DELEGATE_POOL_BPS,
  DELEGATOR_POOL_BPS,
  TWB_WINDOW_SECONDS,
  computeTimeWeightedBalance,
  applyBasisPoints,
  mulDiv,
  wei,
  seconds,
} from "@ens-dis/domain"
import { getCachedEnsName, getCachedAvatarUrl, prefetchEnsNames } from "../ens-cache.js"

const apyRoute = createRoute({
  method: "get",
  path: "/apy/{address}",
  tags: ["APY"],
  summary: "Get estimated APY for an address based on current conditions",
  request: { params: z.object({ address: AddressParam }) },
  responses: {
    200: {
      content: { "application/json": { schema: ApyEstimateSchema } },
      description: "APY estimate",
    },
    500: {
      content: { "application/json": { schema: ErrorSchema } },
      description: "Error",
    },
  },
})

/** ENS name + avatar for a primary address (served from in-memory cache). */
function ensOf(address: string) {
  return { ensName: getCachedEnsName(address), avatarUrl: getCachedAvatarUrl(address) }
}

/** Delegate address fields (or nulls when there is no delegate). */
function delegateEnsOf(delegatedTo: string | null) {
  return {
    delegatedTo,
    delegatedToEnsName: delegatedTo ? getCachedEnsName(delegatedTo) : null,
    delegatedToAvatarUrl: delegatedTo ? getCachedAvatarUrl(delegatedTo) : null,
  }
}

/** Fire-and-forget ENS prefetch; network failures are silently ignored. */
function triggerEnsPrefetch(address: string, delegatedTo: string | null = null) {
  prefetchEnsNames(delegatedTo ? [address, delegatedTo] : [address]).catch(() => {})
}

export const apyRouter = new OpenAPIHono()

apyRouter.openapi(apyRoute, async (c) => {
  const { address } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeLower = toLowerSet(activeDelegates)
    const activeDelegateArray = Array.from(activeDelegates)
    const { monthEnd, poolTier } = await fetchMonthContext(dataSource, activeDelegateArray)

    const monthlyPool = poolTier.poolSize
    const addrLower = address.toLowerCase()
    const isActiveDelegate = activeLower.has(addrLower)

    const accountBalances = await dataSource.delegations.getAccountBalances()
    const accountBalance = accountBalances.find((ab) => ab.accountId.toLowerCase() === addrLower)
    const delegatedTo = accountBalance?.delegate ?? null
    const isDelegatorToActive =
      accountBalance !== undefined && activeLower.has(accountBalance.delegate.toLowerCase())

    if (!isActiveDelegate && !isDelegatorToActive) {
      triggerEnsPrefetch(address, delegatedTo)
      return c.json(
        {
          address,
          ...ensOf(address),
          role: "ineligible" as const,
          ...delegateEnsOf(delegatedTo),
          poolSizeEns: formatWholeEns(monthlyPool),
          estimatedMonthlyRewardEns: "0",
          estimatedApyPct: "0",
          userShareWei: "0",
          totalShareWei: "0",
          currentBalanceEns: "0",
        },
        200,
      )
    }

    const twbWindowStart = seconds(monthEnd - TWB_WINDOW_SECONDS)

    if (isActiveDelegate) {
      triggerEnsPrefetch(address)
      const vpMap = await dataSource.votingPower.getVotingPower(activeDelegateArray)
      // Adapters normalize to lowercase; accept both to be defensive
      const userVP = vpMap.get(address) ?? vpMap.get(addrLower) ?? wei(0n)
      const totalVP = [...vpMap.values()].reduce((sum, vp) => sum + vp, 0n)

      const delegatePool = applyBasisPoints(monthlyPool, DELEGATE_POOL_BPS)
      const rawReward = totalVP > 0n ? mulDiv(userVP, delegatePool, totalVP) : 0n
      const cappedReward = rawReward > poolTier.delegateCap ? poolTier.delegateCap : rawReward

      return c.json(
        {
          address,
          ...ensOf(address),
          role: "delegate" as const,
          ...delegateEnsOf(null),
          poolSizeEns: formatWholeEns(monthlyPool),
          estimatedMonthlyRewardEns: formatEns(cappedReward),
          estimatedApyPct: computeApyPct(cappedReward, userVP),
          userShareWei: userVP.toString(),
          totalShareWei: totalVP.toString(),
          currentBalanceEns: formatEns(userVP),
        },
        200,
      )
    }

    // Delegator path
    const delegations = await dataSource.delegations.getActiveDelegations(activeDelegateArray, monthEnd)
    const allDelegatorIds = [...new Set(delegations.map((d) => d.delegatorId))]

    // Batch balance history in one query; fetch initial balances and current balance in parallel
    const [allEvents, currentBalance, initialBalances] = await Promise.all([
      dataSource.balances.getBalanceHistory(allDelegatorIds, twbWindowStart, monthEnd),
      dataSource.balances.getBalanceAt(address, monthEnd),
      Promise.all(allDelegatorIds.map((id) => dataSource.balances.getBalanceAt(id, twbWindowStart))),
    ])

    // Group events by accountId once (O(n)) to avoid a per-delegator filter inside the loop.
    const eventsByAccount = new Map<string, typeof allEvents>()
    for (const e of allEvents) {
      const bucket = eventsByAccount.get(e.accountId)
      if (bucket) bucket.push(e)
      else eventsByAccount.set(e.accountId, [e])
    }

    let userTWB = 0n
    let totalTWB = 0n
    for (let i = 0; i < allDelegatorIds.length; i++) {
      const id = allDelegatorIds[i]
      const twb = computeTimeWeightedBalance(eventsByAccount.get(id) ?? [], twbWindowStart, monthEnd, initialBalances[i])
      totalTWB += twb
      if (id.toLowerCase() === addrLower) userTWB = twb
    }

    const delegatorPool = applyBasisPoints(monthlyPool, DELEGATOR_POOL_BPS)
    const rawReward = totalTWB > 0n ? mulDiv(userTWB, delegatorPool, totalTWB) : 0n
    const cappedReward = rawReward > poolTier.delegatorCap ? poolTier.delegatorCap : rawReward

    triggerEnsPrefetch(address, delegatedTo)
    return c.json(
      {
        address,
        ...ensOf(address),
        role: "delegator" as const,
        ...delegateEnsOf(delegatedTo),
        poolSizeEns: formatWholeEns(monthlyPool),
        estimatedMonthlyRewardEns: formatEns(cappedReward),
        estimatedApyPct: computeApyPct(cappedReward, currentBalance),
        userShareWei: userTWB.toString(),
        totalShareWei: totalTWB.toString(),
        currentBalanceEns: formatEns(currentBalance),
      },
      200,
    )
  } catch (error) {
    return c.json({ error: internalError(error) }, 500)
  }
})
