import { renderHook, waitFor, act } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/utils'
import { WalletStateContext } from '@/features/wallet/wallet.context'
import type { AppWalletState } from '@/features/wallet/wallet.types'
import { useNudgeGating } from './useNudgeGating'

function makeWrapper(walletState: AppWalletState) {
  const client = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <WalletStateContext.Provider value={walletState}>{children}</WalletStateContext.Provider>
      </QueryClientProvider>
    )
  }
}

const UNSELECTED = {
  status: 'connected',
  address: '0x0000000000000000000000000000000000000000',
} as const

describe('useNudgeGating', () => {
  it('auto-opens the pitch for a connected unselected wallet, then nudges after dismiss', async () => {
    const { result } = renderHook(() => useNudgeGating(), { wrapper: makeWrapper(UNSELECTED) })

    await waitFor(() => expect(result.current.connectedNotSelected).toBe(true))
    expect(result.current.shouldAutoOpenPitch).toBe(true)
    expect(result.current.shouldShowNudge).toBe(false)

    act(() => result.current.dismiss())

    expect(result.current.shouldAutoOpenPitch).toBe(false)
    expect(result.current.shouldShowNudge).toBe(true)
  })

  it('dismissal is ephemeral — a fresh mount re-opens the pitch (no session persistence)', async () => {
    const first = renderHook(() => useNudgeGating(), { wrapper: makeWrapper(UNSELECTED) })
    await waitFor(() => expect(first.result.current.shouldAutoOpenPitch).toBe(true))
    act(() => first.result.current.dismiss())
    expect(first.result.current.shouldAutoOpenPitch).toBe(false)

    // A brand-new mount (≈ navigating away and back, or a reload) starts undismissed.
    const second = renderHook(() => useNudgeGating(), { wrapper: makeWrapper(UNSELECTED) })
    await waitFor(() => expect(second.result.current.shouldAutoOpenPitch).toBe(true))
  })

  it('stays quiet when disconnected', () => {
    const { result } = renderHook(() => useNudgeGating(), {
      wrapper: makeWrapper({ status: 'disconnected' }),
    })
    expect(result.current.connectedNotSelected).toBe(false)
    expect(result.current.shouldAutoOpenPitch).toBe(false)
    expect(result.current.shouldShowNudge).toBe(false)
  })
})
