import { useWalletState } from '@/features/wallet/useWalletState'
import { useMySelection } from './useMySelection'

/**
 * The three matchmaking states every surface keys off of. Built on the wallet
 * state + whether the connected wallet has a stored selection.
 */
export type MatchmakingSelectionState =
  | 'disconnected'
  | 'connected-not-selected'
  | 'connected-selected'

export function useSelectionState(): {
  state: MatchmakingSelectionState
  loading: boolean
} {
  const wallet = useWalletState()
  const { hasSelected, loading } = useMySelection()

  if (wallet.status === 'disconnected') {
    return { state: 'disconnected', loading: false }
  }
  if (loading) {
    // Connected but the selection is still resolving — treat as not-selected so
    // surfaces don't flash the resolved state, but flag loading for spinners.
    return { state: 'connected-not-selected', loading: true }
  }
  return {
    state: hasSelected ? 'connected-selected' : 'connected-not-selected',
    loading: false,
  }
}
