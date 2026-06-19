import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegateValuesCard } from './DelegateValuesCard'

const VIEWER = '0x1111111111111111111111111111111111111111'
const DELEGATE = '0x2222222222222222222222222222222222222222'
const NO_SELECTION = '0x0000000000000000000000000000000000000000'

describe('DelegateValuesCard — matrix states', () => {
  it('both selected → shared/unique comparison + match pill', async () => {
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    // msw returns the same 5 words for both → 100% match.
    await waitFor(() => expect(screen.getByText(/100% match with your priorities/i)).toBeInTheDocument())
    expect(screen.getByText('Shared')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })

  it('viewer selected, delegate not → empty state', async () => {
    renderApp(<DelegateValuesCard delegateAddress={NO_SELECTION} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() =>
      expect(screen.getByText(/hasn.t selected their priorities/i)).toBeInTheDocument(),
    )
  })

  it('logged out → connect wallet CTA', () => {
    renderApp(<DelegateValuesCard delegateAddress={DELEGATE} />, {
      walletState: { status: 'disconnected' },
    })
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })

  it('own profile, selected → own values + edit affordance', async () => {
    renderApp(<DelegateValuesCard delegateAddress={VIEWER} />, {
      walletState: { status: 'connected', address: VIEWER },
    })
    await waitFor(() => expect(screen.getByText(/your values/i)).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /edit values/i })).toBeInTheDocument()
  })
})
