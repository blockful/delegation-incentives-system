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

/**
 * Mock wallet states for development.
 * Activate by adding ?mock=delegated (or connected/disconnected) to the URL.
 */
const MOCK_STATES: Record<string, AppWalletState> = {
  disconnected: { status: 'disconnected' },
  connected: {
    status: 'connected',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  },
  delegated: {
    status: 'delegated',
    address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    delegatedTo: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
    ensName: 'nick.eth',
  },
}

function getMockState(): AppWalletState | null {
  if (!import.meta.env.DEV) return null
  const params = new URLSearchParams(window.location.search)
  const mock = params.get('mock')
  if (!mock) return null
  return MOCK_STATES[mock] ?? MOCK_STATES.delegated
}

export function WalletStateProvider({ children }: { children: ReactNode }) {
  const mockState = getMockState()
  const { address, isConnected } = useAccount()

  const fetchEligibility = useCallback(
    () => api.eligibility(address!),
    [address],
  )

  const eligibility = useAsync(fetchEligibility, !mockState && isConnected && !!address)

  const delegateAddress = eligibility.data?.delegatedTo as `0x${string}` | undefined
  const { data: delegateEnsName } = useEnsName({ address: delegateAddress, chainId: mainnet.id })

  const walletState = useMemo<AppWalletState>(() => {
    // Dev mock override
    if (mockState) return mockState

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
  }, [mockState, isConnected, address, eligibility.data, delegateEnsName])

  return (
    <WalletStateContext.Provider value={walletState}>
      {children}
    </WalletStateContext.Provider>
  )
}
