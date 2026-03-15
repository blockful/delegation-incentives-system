import {
  type IncentivesDataSource,
  identifyActiveDelegates,
  determinePoolTier,
  PROPOSAL_WINDOW_SIZE,
  ONE_ENS,
  POOL_TIERS,
  AVP_WINDOW_SECONDS,
  wei,
  seconds,
  parseMonth,
  monthEndTimestamp,
  previousMonth,
  currentMonth,
} from "@ens-dis/domain"

// ─── Shared helpers ──────────────────────────────────────────────────────────

/** Fetch proposals/votes and identify active delegates. Reused across routes. */
export async function fetchActiveDelegates(dataSource: IncentivesDataSource) {
  const proposals = await dataSource.proposals.getRecentProposals(PROPOSAL_WINDOW_SIZE)
  const proposalIds = proposals.map((p) => p.id)
  const votes = await dataSource.votes.getVotesForProposals(proposalIds)
  const activeDelegates = identifyActiveDelegates(proposals, votes)
  return { proposals, votes, activeDelegates }
}

/** Case-insensitive set from a Set<string>. */
export function toLowerSet(addresses: Set<string>): Set<string> {
  return new Set(Array.from(addresses).map((a) => a.toLowerCase()))
}

/** Resolve current and previous month boundaries + aggregate VP + tier. */
export async function fetchMonthContext(
  dataSource: IncentivesDataSource,
  activeDelegateArray: string[],
) {
  const monthStr = currentMonth()
  const { year, month } = parseMonth(monthStr)
  const monthEnd = monthEndTimestamp(year, month)
  const prevMonthStr = previousMonth(monthStr)
  const { year: prevYear, month: prevMonth } = parseMonth(prevMonthStr)
  const prevMonthEnd = monthEndTimestamp(prevYear, prevMonth)

  const avpWindowStart = (at: typeof monthEnd) =>
    seconds(BigInt(at) - BigInt(AVP_WINDOW_SECONDS))

  const [currentAVP, previousAVP] =
    activeDelegateArray.length > 0
      ? await Promise.all([
          dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, avpWindowStart(monthEnd), monthEnd),
          dataSource.votingPower.getAggregateDelegatedPower(activeDelegateArray, avpWindowStart(prevMonthEnd), prevMonthEnd),
        ])
      : [wei(0n), wei(0n)]

  const poolTier = determinePoolTier(currentAVP, previousAVP, POOL_TIERS)
  const currentTierIndex = POOL_TIERS.findIndex(
    (t) => t.momGrowthMinBps === poolTier.momGrowthMinBps && t.momGrowthMaxBps === poolTier.momGrowthMaxBps,
  )

  return { monthEnd, currentAVP, previousAVP, poolTier, currentTierIndex }
}

/** Convert a Wei reward and Wei balance to an APY percentage string. */
export function computeApyPct(monthlyReward: bigint, balance: bigint): string {
  const rewardEns = Number(monthlyReward) / Number(ONE_ENS)
  const balanceEns = Number(balance) / Number(ONE_ENS)
  const apyPct = balanceEns > 0 ? ((rewardEns * 12) / balanceEns) * 100 : 0
  return apyPct.toFixed(2)
}

/** Format Wei as ENS string (4 decimal places). */
export function formatEns(value: bigint): string {
  return (Number(value) / Number(ONE_ENS)).toFixed(4)
}

/** Format Wei as whole ENS string (for pool sizes/caps). */
export function formatWholeEns(value: bigint): string {
  return `${value / BigInt(ONE_ENS)}`
}

/** Extract error message from unknown catch value. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown error"
}
