import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { RoundDetailResponse, RoundSummary } from '@/api/types'

export interface LotteryRoundResult {
  round: RoundDetailResponse
  rounds: RoundSummary[]
}

function selectLotteryRound(rounds: RoundSummary[], roundNumber?: number): RoundSummary | null {
  const requestedRound = roundNumber == null
    ? null
    : rounds.find((round) => round.roundNumber === roundNumber)

  return requestedRound
    ?? rounds.find((round) =>
      round.distributionDataStatus === 'available' &&
      (round.lotteryBucketCount ?? 0) > 0
    )
    ?? rounds.find((round) => round.distributionDataStatus === 'available')
    ?? rounds.find((round) => round.isCurrent)
    ?? rounds[0]
    ?? null
}

async function fetchLotteryRound(address?: string, roundNumber?: number): Promise<LotteryRoundResult | null> {
  const roundList = await api.rounds()
  const selectedRound = selectLotteryRound(roundList.rounds, roundNumber)
  if (!selectedRound) return null

  const round = await api.round(selectedRound.roundNumber, address, {
    rewardLimit: '25',
  })

  return {
    round,
    rounds: roundList.rounds,
  }
}

export function useLottery(address?: string, roundNumber?: number) {
  const fn = useCallback(() => fetchLotteryRound(address, roundNumber), [address, roundNumber])
  return useAsync(fn)
}
