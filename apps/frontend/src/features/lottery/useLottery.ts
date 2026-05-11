import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'
import type { DistributionResponse } from '@/api/types'

async function fetchLatestDistribution(): Promise<DistributionResponse | null> {
  const months = await api.distributionList()
  if (months.length === 0) return null
  const latest = months[months.length - 1] // list is sorted ascending
  return api.distribution(latest)
}

export function useLottery() {
  const fn = useCallback(() => fetchLatestDistribution(), [])
  return useAsync(fn)
}
