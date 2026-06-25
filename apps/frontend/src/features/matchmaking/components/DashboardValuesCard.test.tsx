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

  it('delegate pre-selection: missing-values nudge with the delegate body copy', async () => {
    // Force the active voter to have no selection.
    server.use(
      http.get('/api/selections/:address', () =>
        HttpResponse.json({ error: 'none' }, { status: 404 }),
      ),
    )
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: ACTIVE_VOTER },
    })
    // The banner renders as soon as the viewer is connected-not-selected; the
    // delegate-facing copy resolves once useViewerRole confirms this wallet is
    // an active voter, so wait for that copy specifically.
    await waitFor(() =>
      expect(screen.getByText(/holders can find you/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/profile is missing values/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
    expect(screen.queryByText(/we cannot match you to delegates/i)).not.toBeInTheDocument()
  })

  it('still shows the nudge when the viewer role cannot be resolved (/voters errors)', async () => {
    // The bug this guards: the banner used to be gated on useViewerRole, so a
    // failed/slow /voters fetch (role === null) made it silently disappear. It
    // must now render regardless, falling back to the holder copy.
    server.use(
      http.get('/api/selections/:address', () =>
        HttpResponse.json({ error: 'none' }, { status: 404 }),
      ),
      http.get('/api/voters/active', () =>
        HttpResponse.json({ error: 'boom' }, { status: 500 }),
      ),
    )
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: HOLDER },
    })
    await waitFor(() =>
      expect(screen.getByText(/profile is missing values/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
  })

  it('holder pre-selection: missing-values nudge with the distinct holder body copy', async () => {
    renderApp(<DashboardValuesCard />, {
      walletState: { status: 'connected', address: HOLDER },
    })
    await waitFor(() =>
      expect(screen.getByText(/profile is missing values/i)).toBeInTheDocument(),
    )
    expect(screen.getByRole('button', { name: /complete profile/i })).toBeInTheDocument()
    // Distinct from the delegate nudge: holder-facing body, no "holders can find you".
    expect(
      screen.getByText(/we cannot match you to delegates\. rank 5 values in 30 seconds\./i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/holders can find you/i)).not.toBeInTheDocument()
  })
})
