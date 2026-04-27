import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'

export function useStats() {
  const fetchStats = useCallback(() => api.status(), [])
  const { data, loading, error } = useAsync(fetchStats)

  return { data, loading, error }
}
