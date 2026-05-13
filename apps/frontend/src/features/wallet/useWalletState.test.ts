import { renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import { WalletStateContext } from './wallet.context'
import { useWalletState } from './useWalletState'
import type { AppWalletState } from './wallet.types'

function wrapper(state: AppWalletState) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(WalletStateContext.Provider, { value: state }, children)
  }
}

describe('useWalletState', () => {
  it('returns disconnected state from context', () => {
    const state: AppWalletState = { status: 'disconnected' }
    const { result } = renderHook(() => useWalletState(), {
      wrapper: wrapper(state),
    })
    expect(result.current).toEqual({ status: 'disconnected' })
  })

  it('returns connected state with address from context', () => {
    const state: AppWalletState = {
      status: 'connected',
      address: '0x1234567890abcdef1234567890abcdef12345678',
    }
    const { result } = renderHook(() => useWalletState(), {
      wrapper: wrapper(state),
    })
    expect(result.current).toEqual(state)
  })

  it('returns delegated state with ensName from context', () => {
    const state: AppWalletState = {
      status: 'delegated',
      address: '0x1234567890abcdef1234567890abcdef12345678',
      delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: 'alice.eth',
    }
    const { result } = renderHook(() => useWalletState(), {
      wrapper: wrapper(state),
    })
    expect(result.current).toEqual(state)
  })
})
