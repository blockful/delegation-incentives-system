import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'

export function useVoters() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['voters', 'active'],
    queryFn: () => api.activeVoters(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  return {
    loading: isLoading,
    error: error ? error.message : null,
    data: data?.voters ?? null,
    count: data?.count ?? 0,
  }
}
