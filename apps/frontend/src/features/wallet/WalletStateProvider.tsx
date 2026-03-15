import { createContext, useCallback, useMemo, type ReactNode } from 'react'
import { useAccount } from 'wagmi'
import { useEnsName } from 'wagmi'
import { mainnet } from 'viem/chains'
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

  const delegateAddress = eligibility.data?.delegatedTo as `0x${string}` | undefined
  const { data: delegateEnsName } = useEnsName({ address: delegateAddress, chainId: mainnet.id })

  const walletState = useMemo<AppWalletState>(() => {
    if (!isConnected || !address) {
      return { status: 'disconnected' }
    }

    if (eligibility.data?.isDelegatorToActiveDelegate && eligibility.data.delegatedTo) {
      return {
        status: 'delegated',
        address,
        delegatedTo: eligibility.data.delegatedTo as `0x${string}`,
        ensName: delegateEnsName ?? undefined,
      }
    }

    return { status: 'connected', address }
  }, [isConnected, address, eligibility.data, delegateEnsName])

  return (
    <WalletStateContext.Provider value={walletState}>
      {children}
    </WalletStateContext.Provider>
  )
}
