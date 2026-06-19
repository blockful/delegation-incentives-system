import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import type { VoterDetail } from '@/api'
import { useWalletState } from '@/features/wallet/useWalletState'
import { useMySelection } from './useMySelection'

/** A voter row carrying its server-computed `match` against the viewer. */
export type VoterWithMatch = VoterDetail

/**
 * Active voters with per-card match resolved SERVER-SIDE: we pass the connected
 * address as `?viewer=` and the backend returns each voter's `match` against the
 * viewer's selection (null when the viewer or the voter hasn't selected). The
 * client no longer scores anything — it just renders. `viewerHasSelected` comes
 * from the viewer's own selection and drives the page-level gating.
 */
export function useVotersWithMatch() {
  const wallet = useWalletState()
  const viewer = wallet.status === 'disconnected' ? undefined : wallet.address
  const { hasSelected } = useMySelection()

  const { data, isLoading, error } = useQuery({
    // Keyed by viewer: the match is relative to whoever is connected.
    queryKey: ['voters', 'active', viewer ?? null],
    queryFn: () => api.activeVoters(viewer),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  })

  return {
    voters: data?.voters ?? null,
    count: data?.count ?? 0,
    loading: isLoading,
    error: error ? (error as Error).message : null,
    viewerHasSelected: hasSelected,
  }
}
