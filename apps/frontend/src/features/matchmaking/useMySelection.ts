import { useWalletState } from '@/features/wallet/useWalletState'
import { useDelegateSelection } from './useDelegateSelection'

/**
 * The connected wallet's own selection. Since selections are public, this is
 * just the connected address's selection (no auth read) — shares the same cache
 * entry as visiting your own profile.
 */
export function useMySelection() {
  const wallet = useWalletState()
  const address = wallet.status === 'disconnected' ? undefined : wallet.address
  return useDelegateSelection(address)
}
