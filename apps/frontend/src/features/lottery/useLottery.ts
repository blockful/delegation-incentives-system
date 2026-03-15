import { useCallback } from 'react'
import { api } from '@/api/client'
import { useAsync } from '@/hooks/useAsync'

function currentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function useLottery() {
  const month = currentMonth()
  const fetchDistribution = useCallback(() => api.distribution(month), [month])
  return useAsync(fetchDistribution)
}
