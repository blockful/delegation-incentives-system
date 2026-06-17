import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { useWalletState } from '@/features/wallet/useWalletState'

export type ViewerRole = 'holder' | 'delegate'

/**
 * The connected wallet's role for copy purposes. A wallet is a "delegate" if
 * it's an active voter (present on /voters); otherwise a "holder". Only the
 * Pitch and Confirm copy differ by this — the action itself is identical.
 */
export function useViewerRole(): { role: ViewerRole | null; loading: boolean } {
  const wallet = useWalletState()
  const address = wallet.status === 'disconnected' ? undefined : wallet.address

  const { data, isLoading } = useQuery({
    queryKey: ['voters', 'active'],
    queryFn: () => api.activeVoters(),
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    enabled: !!address,
  })

  if (!address) return { role: null, loading: false }
  if (!data) return { role: null, loading: isLoading }

  const isDelegate = data.voters.some(
    (v) => v.address.toLowerCase() === address.toLowerCase(),
  )
  return { role: isDelegate ? 'delegate' : 'holder', loading: false }
}
