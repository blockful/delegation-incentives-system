import { http, HttpResponse } from 'msw'
import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { DashboardValuesCard } from './DashboardValuesCard'

// In votersFixture (active voter) + msw returns a selection → connected-selected.
const ACTIVE_VOTER = '0x1234567890abcdef1234567890abcdef12345678'
// Not in votersFixture + 404 selection → holder, not selected.
const HOLDER = '0x0000000000000000000000000000000000000000'

beforeEach(() => window.sessionStorage.clear())

describe('DashboardValuesCard', () => {
  it('post-selection: Values card with the words + Edit affordance', async () => {
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: ACTIVE_VOTER },
    })
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /^values$/i })).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /edit values/i })).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
  })

  it('delegate pre-selection: missing-values nudge', async () => {
    // Force the active voter to have no selection.
    server.use(
      http.get('/api/selections/:address', () =>
        HttpResponse.json({ error: 'none' }, { status: 404 }),
      ),
    )
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: ACTIVE_VOTER },
    })
    await waitFor(() =>
      expect(screen.getByText(/profile is missing values/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
  })

  it('holder pre-selection: renders nothing', async () => {
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: HOLDER },
    })
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: /^values$/i })).not.toBeInTheDocument()
      expect(screen.queryByText(/missing values/i)).not.toBeInTheDocument()
    })
  })
})
