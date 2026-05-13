import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { AprEstimateResponse, TierProgressionResponse, RoundInfoResponse } from '@/api/types'

export interface DashboardData {
  apr: AprEstimateResponse
  tiers: TierProgressionResponse
  round: RoundInfoResponse
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

  if (apr.loading || tiers.loading || round.loading) {
    return { data: null, loading: true, error: null }
  }

  const error = apr.error ?? tiers.error ?? round.error ?? null
  if (error) {
    return { data: null, loading: false, error }
  }

  if (!apr.data || !tiers.data || !round.data) {
    return { data: null, loading: false, error: null }
  }

  return {
    data: { apr: apr.data, tiers: tiers.data, round: round.data },
    loading: false,
    error: null,
  }
}
