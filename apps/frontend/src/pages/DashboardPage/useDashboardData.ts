import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { AprEstimateResponse, TierProgressionResponse, RoundInfoResponse } from '@/api/types'
import { resolveProgramEnded, useRoundList } from '@/features/rounds/programStatus'

export interface DashboardData {
  apr: AprEstimateResponse
  tiers: TierProgressionResponse
  round: RoundInfoResponse
  /** No live round left: show settled totals instead of live estimates. */
  programEnded: boolean
  /** Rounds run in the pilot (0 when /rounds is unavailable). */
  roundCount: number
}

export interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string | null
}

export function useDashboardData(address: `0x${string}`): DashboardState {
  const fetchApr = useCallback(() => api.apr(address), [address])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const apr = useAsync(fetchApr)
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)
  const roundList = useRoundList()

  if (apr.loading || tiers.loading || round.loading || roundList.loading) {
    return { data: null, loading: true, error: null }
  }

  const error = apr.error ?? tiers.error ?? round.error ?? null
  if (error) {
    return { data: null, loading: false, error }
  }

  if (!apr.data || !tiers.data || !round.data) {
    return { data: null, loading: false, error: null }
  }

  // /rounds failing only loses the derived flag; an explicit backend flag
  // still wins, otherwise we fall back to the live dashboard.
  const programEnded = resolveProgramEnded(
    round.data.programEnded ?? tiers.data.programEnded ?? apr.data.programEnded,
    roundList.data,
  )

  return {
    data: {
      apr: apr.data,
      tiers: tiers.data,
      round: round.data,
      programEnded,
      roundCount: roundList.data?.rounds.length ?? 0,
    },
    loading: false,
    error: null,
  }
}
