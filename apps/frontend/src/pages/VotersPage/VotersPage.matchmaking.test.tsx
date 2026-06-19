import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { VotersPage } from './index'

// A connected wallet with no stored selection (the zero address 404s in msw) →
// selectionState 'connected-not-selected'.
const UNSELECTED = {
  status: 'connected',
  address: '0x0000000000000000000000000000000000000000',
} as const

const DISCONNECTED = { status: 'disconnected' } as const

// Dismissal is session-scoped (useNudgeGating → sessionStorage); reset it so each
// test starts on the first-view blocked hero.
beforeEach(() => window.sessionStorage.clear())

describe('VotersPage — unselected viewer', () => {
  it('shows the flag pitch hero first, then the banner after "Not now"', async () => {
    const user = userEvent.setup()
    renderApp(<VotersPage />, { walletState: UNSELECTED })

    // First view: the blocked hero IS the pitch (flag design) over the blurred list.
    await waitFor(() =>
      expect(
        screen.getByText(/find delegates who share your priorities/i),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: 'Select values' })).toBeInTheDocument()

    // Dismiss → legible page + inline unlock banner.
    await user.click(screen.getByRole('button', { name: /not now/i }))
    await waitFor(() =>
      expect(screen.getByText(/want to see how delegates match you/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /select your values/i })).toBeInTheDocument()
  })

  it('opens the selection flow straight at the Select step from the hero CTA', async () => {
    const user = userEvent.setup()
    renderApp(<VotersPage />, { walletState: UNSELECTED })

    await user.click(await screen.findByRole('button', { name: 'Select values' }))
    // The hero is the pitch, so the modal opens directly at Select (chips) — no re-pitch.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Decentralization' })).toBeInTheDocument(),
    )
  })
})

describe('VotersPage — disconnected viewer', () => {
  it('shows the blocked hero with a Connect wallet CTA', async () => {
    renderApp(<VotersPage />, { walletState: DISCONNECTED })
    await waitFor(() =>
      expect(
        screen.getByText(/find delegates who share your priorities/i),
      ).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument()
  })
})
