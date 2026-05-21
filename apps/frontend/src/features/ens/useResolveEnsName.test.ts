import { describe, expect, it, vi } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { usePublicClient } from 'wagmi'
import { useResolveEnsName } from './useResolveEnsName'

vi.mock('@/config/env', () => ({
  env: { useMockApi: true },
}))

vi.mock('@/api/mock', () => ({
  MOCK_ENS_TO_ADDRESS: {
    'nick.eth': '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  },
}))

describe('useResolveEnsName (mock mode)', () => {
  it('resolves a known name from MOCK_ENS_TO_ADDRESS', async () => {
    const { result } = renderHook(() => useResolveEnsName())
    let resolved: string | null = null
    await act(async () => {
      resolved = await result.current.resolve('nick.eth')
    })
    expect(resolved).toBe('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b')
  })

  it('returns null for an unknown name in mock mode', async () => {
    const { result } = renderHook(() => useResolveEnsName())
    let resolved: string | null = null
    await act(async () => {
      resolved = await result.current.resolve('notreal.eth')
    })
    expect(resolved).toBeNull()
  })

  it('lowercases the lookup key', async () => {
    const { result } = renderHook(() => useResolveEnsName())
    let resolved: string | null = null
    await act(async () => {
      resolved = await result.current.resolve('NICK.ETH')
    })
    expect(resolved).toBe('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b')
  })

  it('flips isResolving while a call is in flight', async () => {
    const { result } = renderHook(() => useResolveEnsName())
    expect(result.current.isResolving).toBe(false)
    let promise: Promise<string | null>
    act(() => {
      promise = result.current.resolve('nick.eth')
    })
    await waitFor(() => expect(result.current.isResolving).toBe(true))
    await act(async () => { await promise })
    await waitFor(() => expect(result.current.isResolving).toBe(false))
  })
})

describe('useResolveEnsName (real mode)', () => {
  it('delegates to publicClient.getEnsAddress and normalizes the name', async () => {
    vi.resetModules()
    vi.doMock('@/config/env', () => ({ env: { useMockApi: false } }))
    const getEnsAddress = vi.fn().mockResolvedValue('0xabc')
    vi.mocked(usePublicClient).mockReturnValue({ getEnsAddress } as never)

    const { useResolveEnsName: hook } = await import('./useResolveEnsName')
    const { result } = renderHook(() => hook())
    let resolved: string | null = null
    await act(async () => {
      resolved = await result.current.resolve('Nick.ETH')
    })

    expect(getEnsAddress).toHaveBeenCalledWith({ name: 'nick.eth' })
    expect(resolved).toBe('0xabc')
  })

  it('returns null when publicClient.getEnsAddress rejects', async () => {
    vi.resetModules()
    vi.doMock('@/config/env', () => ({ env: { useMockApi: false } }))
    const getEnsAddress = vi.fn().mockRejectedValue(new Error('rpc down'))
    vi.mocked(usePublicClient).mockReturnValue({ getEnsAddress } as never)

    const { useResolveEnsName: hook } = await import('./useResolveEnsName')
    const { result } = renderHook(() => hook())
    let resolved: string | null = 'sentinel' as unknown as null
    await act(async () => {
      resolved = await result.current.resolve('nick.eth')
    })
    expect(resolved).toBeNull()
  })
})
