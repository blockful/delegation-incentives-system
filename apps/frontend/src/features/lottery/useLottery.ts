import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { RoundDetailResponse, RoundSummary } from '@/api/types'

export interface LotteryRoundResult {
  round: RoundDetailResponse
  rounds: RoundSummary[]
}

function selectLotteryRound(rounds: RoundSummary[]): RoundSummary | null {
  return rounds.find((round) =>
    round.distributionDataStatus === 'available' &&
    (round.lotteryBucketCount ?? 0) > 0
  )
    ?? rounds.find((round) => round.distributionDataStatus === 'available')
    ?? rounds.find((round) => round.isCurrent)
    ?? rounds[0]
    ?? null
}

async function fetchLotteryRound(address?: string): Promise<LotteryRoundResult | null> {
  const roundList = await api.rounds()
  const selectedRound = selectLotteryRound(roundList.rounds)
  if (!selectedRound) return null

  const round = await api.round(selectedRound.roundNumber, address, {
    rewardLimit: '25',
  })

  return {
    round,
    rounds: roundList.rounds,
  }
}

export function useLottery(address?: string) {
  const fn = useCallback(() => fetchLotteryRound(address), [address])
  return useAsync(fn)
}
