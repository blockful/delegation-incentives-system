import { useQuery } from '@tanstack/react-query'
import { api, ApiClientError } from '@/api'
import type { SelectionResponse } from '@/api'
import { matchmakingKeys } from './queryKeys'

/**
 * Any address's public selection. A 404 (no selection yet) is a normal state,
 * not an error — it resolves to `null`. This is the shared base for both an
 * arbitrary delegate's selection and the viewer's own (see useMySelection).
 */
export function useDelegateSelection(address?: string) {
  const { data, isLoading } = useQuery({
    queryKey: matchmakingKeys.selection(address),
    enabled: !!address,
    staleTime: 60_000,
    retry: false,
    queryFn: async (): Promise<SelectionResponse | null> => {
      try {
        return await api.selection(address!)
      } catch (e) {
        if (e instanceof ApiClientError && e.status === 404) return null
        throw e
      }
    },
  })

  return {
    selection: data ?? null,
    words: data?.words ?? null,
    hasSelected: !!data,
    loading: !!address && isLoading,
  }
}
