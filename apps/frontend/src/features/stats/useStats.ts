import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'

export function useStats() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: () => api.status(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? error.message : null,
  }
}
