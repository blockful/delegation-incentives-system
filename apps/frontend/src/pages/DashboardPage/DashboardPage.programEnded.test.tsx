import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: false, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { Route, Routes, useLocation } from 'react-router-dom'
import { screen } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { endedProgramHandlers, type BackendShape } from '@/test/mocks/programEndedHandlers'
import { DashboardPage } from '.'

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`
const CONNECTED = { status: 'connected' as const, address: ADDRESS }
const DELEGATED = {
  status: 'delegated' as const,
  address: ADDRESS,
  delegatedTo: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5' as `0x${string}`,
}

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname + location.search}</div>
}

function renderDashboard(walletState: typeof CONNECTED | typeof DELEGATED) {
  return renderApp(
    <Routes>
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/rounds/:roundNumber" element={<LocationProbe />} />
    </Routes>,
    { walletState, initialPath: '/dashboard' },
  )
}

describe.each<BackendShape>(['extended', 'legacy'])(
  'DashboardPage once the pilot has ended (%s backend)',
  (shape) => {
    beforeEach(() => {
      server.use(...endedProgramHandlers(shape))
    })

    it('shows the wallet total across all rounds instead of a live estimate', async () => {
      renderDashboard(DELEGATED)

      expect(await screen.findByText('Total earned in the pilot')).toBeInTheDocument()
      // 400 + 250.5 from the paid rounds; the not-eligible round adds nothing.
      expect(screen.getByText('+650.50000')).toBeInTheDocument()
      expect(screen.getByText('Program ended after 3 rounds')).toBeInTheDocument()

      expect(screen.queryByText('Your rewards this round')).not.toBeInTheDocument()
      expect(screen.queryByText(/left$/)).not.toBeInTheDocument()
      expect(screen.queryByText('Last day')).not.toBeInTheDocument()
      expect(screen.queryByText(/first round closes/)).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Share to earn more/ })).not.toBeInTheDocument()
    })

    it('lists every round with its amount and links to the round detail for this wallet', async () => {
      renderDashboard(DELEGATED)

      expect(await screen.findByText('Payouts by round')).toBeInTheDocument()
      expect(screen.getByText('+400 ENS')).toBeInTheDocument()
      expect(screen.getByText('+250.5 ENS')).toBeInTheDocument()
      expect(screen.getByText('0 ENS')).toBeInTheDocument()
      expect(screen.getByText('September 2026')).toBeInTheDocument()
      expect(screen.getByText('July 2026')).toBeInTheDocument()

      await userEvent.click(screen.getByRole('button', { name: 'View Round 1 details' }))
      expect(screen.getByTestId('location')).toHaveTextContent(`/rounds/1?address=${ADDRESS}`)
    })

    it('keeps the delegate CTA for a wallet that is not delegating', async () => {
      renderDashboard(CONNECTED)

      expect(await screen.findByText('Total earned in the pilot')).toBeInTheDocument()
      expect(screen.queryByText('You’re not earning yet')).not.toBeInTheDocument()
      expect(screen.queryByText(/start earning rewards/)).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Pick a delegate/ })).toBeInTheDocument()
    })
  },
)

describe('DashboardPage while a round is live', () => {
  it('keeps the live estimate, countdown and recent payouts', async () => {
    renderDashboard(DELEGATED)

    expect(await screen.findByText('Your rewards this round')).toBeInTheDocument()
    expect(screen.getByText('+16.35000')).toBeInTheDocument()
    expect(screen.getByText('28d left')).toBeInTheDocument()
    expect(screen.getAllByText('Round 3').length).toBeGreaterThan(0)
    expect(screen.getByText('Recent Payouts')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Share to earn more/ })).toBeInTheDocument()
    expect(screen.queryByText('Total earned in the pilot')).not.toBeInTheDocument()
  })
})
