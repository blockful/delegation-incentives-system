import type {
  AddressDistributionHistoryResponse,
  AddressRoundReward,
  RoundDetailResponse,
  RoundInfoResponse,
  RoundListResponse,
  RoundSummary,
} from '@/api/types'
import { getUtcMonthRange } from '@/utils/format'

export function buildRoundListFromCurrentRound(current: RoundInfoResponse): RoundListResponse {
  const rounds: RoundSummary[] = []

  for (let offset = 0; offset < current.roundNumber; offset += 1) {
    const roundNumber = current.roundNumber - offset
    const range = offset === 0
      ? { startDate: current.startDate, endDate: current.endDate }
      : getUtcMonthRange(current.startDate, -offset)

    if (!range) continue

    rounds.push({
      roundNumber,
      month: range.startDate.slice(0, 7),
      startDate: range.startDate,
      endDate: range.endDate,
      status: offset === 0 ? 'live' : 'ended',
      distributionDataStatus: offset === 0 ? 'in_progress' : 'missing',
      isCurrent: offset === 0,
      percentComplete: offset === 0 ? current.percentComplete : 100,
      daysRemaining: offset === 0 ? current.daysRemaining : 0,
      tierIndex: offset === 0 ? current.tierIndex : null,
      tierLabel: offset === 0 ? `Tier #${current.tierIndex + 1}` : null,
      poolSize: null,
      poolSizeEns: offset === 0 ? current.poolSizeEns : null,
      totalDistributed: null,
      totalDistributedEns: null,
      activeDelegateCount: null,
      eligibleDelegatorCount: null,
      computedAt: null,
    })
  }

  return {
    currentRoundNumber: current.roundNumber,
    rounds,
  }
}

export function buildUnavailableAddressHistory(
  address: string,
  rounds: RoundSummary[],
): AddressDistributionHistoryResponse {
  return {
    address,
    rounds: rounds.map((round) => ({
      ...buildUnavailableAddressReward(address, round.distributionDataStatus),
      roundNumber: round.roundNumber,
      month: round.month,
      startDate: round.startDate,
      endDate: round.endDate,
      roundStatus: round.status,
      distributionDataStatus: round.distributionDataStatus,
    })),
  }
}

export function buildRoundDetailFallback(
  round: RoundSummary,
  address?: string,
): RoundDetailResponse {
  return {
    ...round,
    addressReward: address
      ? buildUnavailableAddressReward(address, round.distributionDataStatus)
      : null,
    topDelegateRewards: [],
    topTokenHolderRewards: [],
  }
}

function buildUnavailableAddressReward(
  address: string,
  distributionDataStatus: RoundSummary['distributionDataStatus'],
): AddressRoundReward {
  return {
    address,
    rewardStatus: distributionDataStatus === 'in_progress' ? 'pending' : 'unavailable',
    delegateReward: '0',
    delegateRewardEns: '0.000000000000000000',
    tokenHolderReward: '0',
    tokenHolderRewardEns: '0.000000000000000000',
    lotteryReward: '0',
    lotteryRewardEns: '0.000000000000000000',
    totalReward: '0',
    totalRewardEns: '0.000000000000000000',
  }
}
