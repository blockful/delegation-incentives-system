import { describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import type { VoterDetail } from '@/api/types'
import { useVoterEnsNames } from './useVoterEnsNames'

vi.mock('@/config/env', () => ({
  env: { useMockApi: true },
}))

vi.mock('@/api/mock', () => ({
  MOCK_ENS_TO_ADDRESS: {
    'nick.eth': '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
    'slobo.eth': '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  },
}))

function voter(overrides: Partial<VoterDetail>): VoterDetail {
  return {
    address: '0x0000000000000000000000000000000000000000',
    ensName: null,
    avatarUrl: null,
    votingPower: '0',
    votesInLast10: 0,
    tokenHolderCount: 0,
    activeSince: null,
    last10ProposalsVoted: [],
    ...overrides,
  } as VoterDetail
}

describe('useVoterEnsNames (mock mode)', () => {
  it('returns an empty map for null input', () => {
    const { result } = renderHook(() => useVoterEnsNames(null))
    expect(result.current.map.size).toBe(0)
  })

  it('reverse-maps MOCK_ENS_TO_ADDRESS for voters with no ensName', () => {
    const voters = [
      voter({ address: '0x1A2b3c4D5e6f7A8b9C0D1e2F3a4b5c6d7e8F9a0B' }),
      voter({ address: '0xDEADbeefDEADbeefDEADbeefDEADbeefDEADbeef' }),
    ]
    const { result } = renderHook(() => useVoterEnsNames(voters))
    expect(result.current.map.get('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b'))
      .toBe('nick.eth')
    expect(result.current.map.get('0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'))
      .toBeNull()
  })

  it('skips voters with API-provided ensName', () => {
    const voters = [
      voter({
        address: '0x1A2b3c4D5e6f7A8b9C0D1e2F3a4b5c6d7e8F9a0B',
        ensName: 'override.eth',
      }),
    ]
    const { result } = renderHook(() => useVoterEnsNames(voters))
    expect(result.current.map.has('0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b')).toBe(false)
  })
})

describe('useVoterEnsNames (real mode)', () => {
  it('accepts reports from children and exposes them via map', async () => {
    vi.resetModules()
    vi.doMock('@/config/env', () => ({ env: { useMockApi: false } }))
    const { useVoterEnsNames: hook } = await import('./useVoterEnsNames')
    const voters = [
      voter({ address: '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa' }),
    ]
    const { result } = renderHook(() => hook(voters))
    expect(result.current.map.size).toBe(0)

    act(() => {
      result.current.report(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'reported.eth',
      )
    })
    expect(result.current.map.get('0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'))
      .toBe('reported.eth')
  })

  it('does not allocate a new map when report repeats the same value', async () => {
    vi.resetModules()
    vi.doMock('@/config/env', () => ({ env: { useMockApi: false } }))
    const { useVoterEnsNames: hook } = await import('./useVoterEnsNames')
    const voters = [
      voter({ address: '0xAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaaAAAAaaaa' }),
    ]
    const { result } = renderHook(() => hook(voters))

    act(() => {
      result.current.report(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'reported.eth',
      )
    })
    const first = result.current.map
    act(() => {
      result.current.report(
        '0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        'reported.eth',
      )
    })
    expect(result.current.map).toBe(first)
  })
})
