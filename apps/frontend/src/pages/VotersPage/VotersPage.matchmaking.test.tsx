import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { VotersPage } from './index'

// A connected wallet with no stored selection (the zero address 404s in msw) →
// selectionState 'connected-not-selected'.
const UNSELECTED = {
  status: 'connected',
  address: '0x0000000000000000000000000000000000000000',
} as const

describe('VotersPage — unselected viewer', () => {
  it('shows the pitch overlay first, then the banner after "Not now"', async () => {
    const user = userEvent.setup()
    renderApp(<VotersPage />, { walletState: UNSELECTED })

    // First view: overlay over the (blurred) list.
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /discover your matches/i })).toBeInTheDocument(),
    )

    // Dismiss → legible page + inline unlock banner.
    await user.click(screen.getByRole('button', { name: /not now/i }))
    await waitFor(() =>
      expect(screen.getByText(/want to see how delegates match you/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /select your values/i })).toBeInTheDocument()
  })

  it('opens the selection flow from the overlay CTA', async () => {
    const user = userEvent.setup()
    renderApp(<VotersPage />, { walletState: UNSELECTED })

    await user.click(
      await screen.findByRole('button', { name: /discover your matches/i }),
    )
    // The zero address isn't an active voter → holder pitch copy.
    await waitFor(() =>
      expect(screen.getByText(/find delegates who share your priorities/i)).toBeInTheDocument(),
    )
  })
})
