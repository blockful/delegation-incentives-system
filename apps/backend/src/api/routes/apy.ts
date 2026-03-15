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

export const apyRouter = new OpenAPIHono()

apyRouter.openapi(apyRoute, async (c) => {
  const { address } = c.req.valid("param")
  try {
    const dataSource = buildDataSource()
    const { activeDelegates } = await fetchActiveDelegates(dataSource)
    const activeLower = toLowerSet(activeDelegates)
    const activeDelegateArray = Array.from(activeDelegates)
    const { monthEnd, poolTier } = await fetchMonthContext(
      dataSource,
      activeDelegateArray,
    )

    const monthlyPool = poolTier.poolSize
    const isActiveDelegate = activeLower.has(address.toLowerCase())
    const accountBalances = await dataSource.delegations.getAccountBalances()
    const accountBalance = accountBalances.find(
      (ab) => ab.accountId.toLowerCase() === address.toLowerCase(),
    )
    const isDelegatorToActive =
      accountBalance !== undefined && activeLower.has(accountBalance.delegate.toLowerCase())

    if (!isActiveDelegate && !isDelegatorToActive) {
      return c.json(
        {
          address,
          role: "ineligible" as const,
          delegatedTo: accountBalance?.delegate ?? null,
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
      const vpMap = await dataSource.votingPower.getVotingPower(activeDelegateArray)
      const userVP = vpMap.get(address) ?? vpMap.get(address.toLowerCase()) ?? wei(0n)
      let totalVP = 0n
      for (const vp of vpMap.values()) totalVP += vp

      const delegatePool = applyBasisPoints(monthlyPool, DELEGATE_POOL_BPS)
      const estimatedReward = totalVP > 0n ? mulDiv(userVP, delegatePool, totalVP) : 0n
      const cappedReward =
        estimatedReward > poolTier.delegateCap ? poolTier.delegateCap : estimatedReward

      return c.json(
        {
          address,
          role: "delegate" as const,
          delegatedTo: null,
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

    // Delegator APY
    const balanceEvents = await dataSource.balances.getBalanceHistory(
      [address],
      twbWindowStart,
      monthEnd,
    )
    const initialBalance = await dataSource.balances.getBalanceAt(address, twbWindowStart)
    const userTWB = computeTimeWeightedBalance(
      balanceEvents,
      twbWindowStart,
      monthEnd,
      initialBalance,
    )
    const currentBalance = await dataSource.balances.getBalanceAt(address, monthEnd)

    const delegations = await dataSource.delegations.getActiveDelegations(
      activeDelegateArray,
      monthEnd,
    )
    const allDelegatorIds = [...new Set(delegations.map((d) => d.delegatorId))]

    let totalTWB = 0n
    for (const delegatorId of allDelegatorIds) {
      const events = await dataSource.balances.getBalanceHistory(
        [delegatorId],
        twbWindowStart,
        monthEnd,
      )
      const initBal = await dataSource.balances.getBalanceAt(delegatorId, twbWindowStart)
      totalTWB += computeTimeWeightedBalance(events, twbWindowStart, monthEnd, initBal)
    }

    const delegatorPool = applyBasisPoints(monthlyPool, DELEGATOR_POOL_BPS)
    const estimatedReward = totalTWB > 0n ? mulDiv(userTWB, delegatorPool, totalTWB) : 0n
    const cappedReward =
      estimatedReward > poolTier.delegatorCap ? poolTier.delegatorCap : estimatedReward

    return c.json(
      {
        address,
        role: "delegator" as const,
        delegatedTo: accountBalance?.delegate ?? null,
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
