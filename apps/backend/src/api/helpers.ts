import {
  type IncentivesDataSource,
  identifyActiveDelegates,
  determinePoolTier,
  PROPOSAL_WINDOW_SIZE,
  ONE_ENS,
  POOL_TIERS,
  wei,
  parseMonth,
  monthEndTimestamp,
  previousMonth,
  currentMonth,
  basisPoints,
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

  const [currentAVP, previousAVP] =
    activeDelegateArray.length > 0
      ? await Promise.all([
          dataSource.votingPower.getAggregateVotingPowerAt(activeDelegateArray, monthEnd),
          dataSource.votingPower.getAggregateVotingPowerAt(activeDelegateArray, prevMonthEnd),
        ])
      : [wei(0n), wei(0n)]

  // Bootstrap guard: same logic as pipeline.ts — if previousAVP is 0 (first program
  // month), percentageGrowthBps returns 100% which would select tier 6. Force tier 0
  // so the dashboard matches what the actual distribution will produce.
  const poolTier =
    previousAVP === 0n ? POOL_TIERS[0] : determinePoolTier(currentAVP, previousAVP, POOL_TIERS)
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

/**
 * Compute the maximum delegator APY percentage for a given tier.
 * Formula: (delegatorPool * 12 / totalWeightEns) * 100
 * where delegatorPool = poolSizeEns * delegatorPoolBps / 10000
 *
 * All inputs are plain numbers (ENS units, not Wei).
 * Returns a fixed-2 string; returns "0.00" when totalWeightEns is 0.
 */
export function computeMaxDelegatorApyPct(
  poolSizeEns: number,
  delegatorPoolBps: number,
  totalWeightEns: number,
): string {
  if (totalWeightEns === 0) return "0.00"
  const delegatorPool = (poolSizeEns * delegatorPoolBps) / 10000
  const apyPct = (delegatorPool * 12 / totalWeightEns) * 100
  return apyPct.toFixed(2)
}

/** Log the full error internally; return a safe message for clients. */
export function internalError(error: unknown): string {
  console.error("[API error]", error)
  return "Internal server error"
}
