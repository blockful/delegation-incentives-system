import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'

export function useDelegates() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['delegates', 'active'],
    queryFn: () => api.activeDelegates(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  return {
    loading: isLoading,
    error: error ? error.message : null,
    data: data?.delegates ?? null,
    count: data?.count ?? 0,
  }
}
