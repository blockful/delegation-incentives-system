import { useCallback } from 'react'
import { api } from '@/api'
import { useAsync } from '@/hooks/useAsync'

export function useDelegates() {
  const fetchDelegates = useCallback(() => api.activeDelegates(), [])
  const { data, loading, error } = useAsync(fetchDelegates)

  return {
    loading,
    error,
    data: data?.delegates ?? null,
    count: data?.count ?? 0,
  }
}
