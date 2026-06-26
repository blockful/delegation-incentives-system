import { renderHook, waitFor, act } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { createTestQueryClient } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { WalletStateContext } from '@/features/wallet/wallet.context'
import type { AppWalletState } from '@/features/wallet/wallet.types'
import type { VoterDetail } from '@/api'
import { useWordPool } from './useWordPool'
import { useMySelection } from './useMySelection'
import { useVotersWithMatch } from './useVotersWithMatch'
import { useSelectionState } from './useSelectionState'
import { useSubmitSelection } from './useSubmitSelection'

const SELECTED = '0x1234567890abcdef1234567890abcdef12345678' as const
const NO_SELECTION = '0x0000000000000000000000000000000000000000' as const
const FIVE_WORDS = ['ens_adoption', 'user_experience', 'public_goods_funding', 'governance_transparency', 'ensv2']

function makeWrapper(walletState: AppWalletState = { status: 'disconnected' }) {
  const client = createTestQueryClient()
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <WalletStateContext.Provider value={walletState}>
          {children}
        </WalletStateContext.Provider>
      </QueryClientProvider>
    )
  }
}

function makeVoter(overrides: Partial<VoterDetail>): VoterDetail {
  return {
    address: '0x00000000000000000000000000000000000000aa',
    ensName: null,
    avatarUrl: null,
    votingPower: '1000000000000000000000',
    votesInLast10: 5,
    last10ProposalsVoted: [true, true, true, true, true, false, false, false, false, false],
    last10Proposals: [],
    tokenHolderCount: 0,
    activeSince: null,
    words: null,
    match: null,
    ...overrides,
  }
}

describe('useWordPool', () => {
  it('loads the pool', async () => {
    const { result } = renderHook(() => useWordPool(), { wrapper: makeWrapper() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.pool?.map((w) => w.id)).toContain('ens_adoption')
  })
})

describe('useMySelection', () => {
  it('returns null when the wallet has no selection (404 → not an error)', async () => {
    const { result } = renderHook(() => useMySelection(), {
      wrapper: makeWrapper({ status: 'connected', address: NO_SELECTION }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.selection).toBeNull()
    expect(result.current.hasSelected).toBe(false)
  })

  it('returns the stored selection when present', async () => {
    const { result } = renderHook(() => useMySelection(), {
      wrapper: makeWrapper({ status: 'connected', address: SELECTED }),
    })
    await waitFor(() => expect(result.current.hasSelected).toBe(true))
    expect(result.current.words).toEqual(FIVE_WORDS)
  })
})

describe('useVotersWithMatch', () => {
  it('surfaces the server-computed match per voter, null when a side is unselected', async () => {
    server.use(
      http.get('/api/voters/active', () =>
        HttpResponse.json({
          count: 2,
          voters: [
            makeVoter({
              address: '0x00000000000000000000000000000000000000a1',
              words: FIVE_WORDS,
              match: { percent: 100, strongMatch: true, sharedWords: FIVE_WORDS, aUnique: [], bUnique: [] },
            }),
            makeVoter({ address: '0x00000000000000000000000000000000000000a2', words: null, match: null }),
          ],
        }),
      ),
    )

    const { result } = renderHook(() => useVotersWithMatch(), {
      wrapper: makeWrapper({ status: 'connected', address: SELECTED }),
    })

    // Match resolves once both the voters list and the viewer's selection load.
    await waitFor(() => expect(result.current.voters?.[0]?.match).toBeTruthy())
    expect(result.current.viewerHasSelected).toBe(true)
    expect(result.current.voters![0].match?.percent).toBe(100)
    expect(result.current.voters![0].match?.strongMatch).toBe(true)
    expect(result.current.voters![1].match).toBeNull() // delegate hasn't selected
  })
})

describe('useSelectionState', () => {
  it('disconnected when no wallet', () => {
    const { result } = renderHook(() => useSelectionState(), { wrapper: makeWrapper() })
    expect(result.current.state).toBe('disconnected')
  })

  it('connected-not-selected when the wallet has no selection', async () => {
    const { result } = renderHook(() => useSelectionState(), {
      wrapper: makeWrapper({ status: 'connected', address: NO_SELECTION }),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state).toBe('connected-not-selected')
  })

  it('connected-selected when the wallet has a selection', async () => {
    const { result } = renderHook(() => useSelectionState(), {
      wrapper: makeWrapper({ status: 'connected', address: SELECTED }),
    })
    await waitFor(() => expect(result.current.state).toBe('connected-selected'))
  })
})

describe('useSubmitSelection', () => {
  it('signs and upserts the selection', async () => {
    const { result } = renderHook(() => useSubmitSelection(), {
      wrapper: makeWrapper({ status: 'connected', address: SELECTED }),
    })

    let res: { address: string; words: string[] } | undefined
    await act(async () => {
      res = await result.current.mutateAsync(FIVE_WORDS)
    })

    expect(res?.address).toBe(SELECTED)
    expect(res?.words).toEqual(FIVE_WORDS)
  })

  it('rejects when the wallet is disconnected', async () => {
    const { result } = renderHook(() => useSubmitSelection(), { wrapper: makeWrapper() })
    await expect(result.current.mutateAsync(FIVE_WORDS)).rejects.toThrow(/wallet/i)
  })
})
