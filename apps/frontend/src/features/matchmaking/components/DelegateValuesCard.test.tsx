import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { DelegateValuesCard } from './DelegateValuesCard'

const VIEWER = '0x1111111111111111111111111111111111111111'
const DELEGATE = '0x2222222222222222222222222222222222222222'
const NO_SELECTION = '0x0000000000000000000000000000000000000000'

// The default handler returns the same 5 words for every non-zero address (→
// 100% / Strong) and 404 for the zero address (→ no selection). Tests that need
// other shapes override per-address with `server.use`.

/** Make `address` resolve to `words` (or 404 when null); everyone else → 404. */
function selectionsBy(map: Record<string, string[] | null>) {
  return http.get('/api/selections/:address', ({ params }) => {
    const addr = String(params.address).toLowerCase()
    const words = map[addr]
    if (!words) {
      return HttpResponse.json({ error: 'No selection for this address' }, { status: 404 })
    }
    return HttpResponse.json({ address: addr, words, updatedAt: 1781619462005 })
  })
}

describe('DelegateValuesCard — matrix states', () => {
  it('both selected, full overlap → 100% ring + Strong match', async () => {
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    // msw returns the same 5 words for both → 100% match.
    await waitFor(() => expect(screen.getByText('100%')).toBeInTheDocument())
    expect(screen.getByText('Strong match')).toBeInTheDocument()
    expect(screen.getByText('You both value')).toBeInTheDocument()
    expect(screen.getByText('ENS Adoption')).toBeInTheDocument()
  })

  it('both selected, partial overlap → 60% ring + Partial match + differ list', async () => {
    server.use(
      selectionsBy({
        [VIEWER.toLowerCase()]: ['ens_adoption', 'user_experience', 'public_goods_funding', 'a', 'b'],
        [DELEGATE.toLowerCase()]: ['ens_adoption', 'user_experience', 'public_goods_funding', 'c', 'd'],
      }),
    )
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() => expect(screen.getByText('60%')).toBeInTheDocument())
    expect(screen.getByText('Partial match')).toBeInTheDocument()
    expect(screen.getByText('You differ on')).toBeInTheDocument()
    // Delegate's name labels its differ column.
    expect(screen.getByText('nick.eth')).toBeInTheDocument()
  })

  it('both selected, no overlap → 0% ring + "what they stand for"', async () => {
    server.use(
      selectionsBy({
        [VIEWER.toLowerCase()]: ['a', 'b', 'c', 'd', 'e'],
        [DELEGATE.toLowerCase()]: ['ens_adoption', 'user_experience', 'public_goods_funding', 'governance_transparency', 'ensv2'],
      }),
    )
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
    expect(screen.getByText('No shared values')).toBeInTheDocument()
    // Explicit "no values in common" message + what the delegate stands for.
    expect(screen.getByText('No values in common')).toBeInTheDocument()
    expect(screen.getByText(/stands for/i)).toBeInTheDocument()
  })

  it('viewer not picked + delegate picked → locked prompt, NO delegate chips (the gate)', async () => {
    server.use(
      selectionsBy({
        // viewer (VIEWER) → 404; delegate has the default 5 words.
        [DELEGATE.toLowerCase()]: ['ens_adoption', 'user_experience', 'public_goods_funding', 'governance_transparency', 'ensv2'],
      }),
    )
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() =>
      expect(screen.getByText(/see how you match nick\.eth/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /pick your values/i })).toBeInTheDocument()
    // The delegate's words must NOT leak to a holder who hasn't picked.
    expect(screen.queryByText('ENS Adoption')).not.toBeInTheDocument()
  })

  it('neither picked → "Start matching" nudge', async () => {
    server.use(selectionsBy({})) // everyone → 404
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() => expect(screen.getByText(/start matching/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /pick your values/i })).toBeInTheDocument()
  })

  it('viewer picked, delegate not → "hasn\'t set their values yet", no CTA', async () => {
    renderApp(<DelegateValuesCard delegateAddress={NO_SELECTION} delegateName="nick.eth" />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() =>
      expect(screen.getByText(/hasn.t set their values yet/i)).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('logged out → connect wallet CTA', () => {
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} />, {
      walletState: { status: 'disconnected' },
    })
    expect(screen.getByText(/connect to see your match/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('falls back to "this delegate" when no ENS name is given', async () => {
    renderApp(<DelegateValuesCard delegateAddress={NO_SELECTION} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() =>
      expect(screen.getByText(/this delegate hasn.t set their values yet/i)).toBeInTheDocument(),
    )
  })

  it('own profile, selected → own values + edit affordance', async () => {
    renderApp(<DelegateValuesCard delegateAddress={VIEWER} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() => expect(screen.getByText(/your values/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /edit values/i })).toBeInTheDocument()
  })

  it('own profile, not selected → missing-values prompt', async () => {
    server.use(selectionsBy({})) // own address → 404
    renderApp(<DelegateValuesCard delegateAddress={VIEWER} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() =>
      expect(screen.getByText(/profile is missing values/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
  })
})
