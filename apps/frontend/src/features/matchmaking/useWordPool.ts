import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { matchmakingKeys } from './queryKeys'

/** The ~20-word pool the Selection modal renders. Rarely changes within a session. */
export function useWordPool() {
  const { data, isLoading, error } = useQuery({
    queryKey: matchmakingKeys.wordPool(),
    queryFn: () => api.wordPool(),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
  })

  return {
    pool: data?.pool ?? null,
    loading: isLoading,
    error: error ? (error as Error).message : null,
  }
}
