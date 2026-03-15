import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { ApyEstimateResponse, TierProgressionResponse, RoundInfoResponse } from '@/api/types'

export interface DashboardData {
  apy: ApyEstimateResponse
  tiers: TierProgressionResponse
  round: RoundInfoResponse
}

export interface DashboardState {
  data: DashboardData | null
  loading: boolean
  error: string | null
}

export function useDashboardData(address: `0x${string}`): DashboardState {
  const fetchApy = useCallback(() => api.apy(address), [address])
  const fetchTiers = useCallback(() => api.tierProgression(), [])
  const fetchRound = useCallback(() => api.currentRound(), [])
  const apy = useAsync(fetchApy)
  const tiers = useAsync(fetchTiers)
  const round = useAsync(fetchRound)

  if (apy.loading || tiers.loading || round.loading) {
    return { data: null, loading: true, error: null }
  }

  const error = apy.error ?? tiers.error ?? round.error ?? null
  if (error) {
    return { data: null, loading: false, error }
  }

  if (!apy.data || !tiers.data || !round.data) {
    return { data: null, loading: false, error: null }
  }

  return {
    data: { apy: apy.data, tiers: tiers.data, round: round.data },
    loading: false,
    error: null,
  }
}
