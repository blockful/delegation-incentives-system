import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { matchmakingKeys } from './queryKeys'

/**
 * Aggregate strong-match counts for an address (powers the Confirm pills).
 * `matchingActiveVoters` = matching delegates (holder pill); `matchingHolders`
 * = matchCount − that (delegate pill).
 */
export function useMatchCount(address?: string) {
  const { data, isLoading } = useQuery({
    queryKey: matchmakingKeys.matchCount(address),
    enabled: !!address,
    queryFn: () => api.matchCount(address!),
    staleTime: 60_000,
  })

  return {
    matchCount: data?.matchCount ?? 0,
    matchingActiveVoters: data?.matchingActiveVoters ?? 0,
    matchingHolders: data ? data.matchCount - data.matchingActiveVoters : 0,
    loading: !!address && isLoading,
  }
}
