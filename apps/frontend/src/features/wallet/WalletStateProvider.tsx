import { createContext, useCallback, useMemo, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useAsync } from '@/hooks/useAsync'
import { api } from '@/api/client'
import type { AppWalletState } from './wallet.types'

export const WalletStateContext = createContext<AppWalletState>({
  status: 'disconnected',
})

export function WalletStateProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount()

  const fetchEligibility = useCallback(
    () => api.eligibility(address!),
    [address],
  )

  const eligibility = useAsync(fetchEligibility, isConnected && !!address)

  const walletState = useMemo<AppWalletState>(() => {
    if (!isConnected || !address) {
      return { status: 'disconnected' }
    }

    if (eligibility.data?.eligible && eligibility.data.delegatedTo) {
      return {
        status: 'delegated',
        address,
        delegatedTo: eligibility.data.delegatedTo as `0x${string}`,
      }
    }

    return { status: 'connected', address }
  }, [isConnected, address, eligibility.data])

  return (
    <WalletStateContext.Provider value={walletState}>
      {children}
    </WalletStateContext.Provider>
  )
}
