import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: false, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { server } from '@/test/mocks/server'
import { endedProgramHandlers, type BackendShape } from '@/test/mocks/programEndedHandlers'
import type { AppWalletState } from '@/features/wallet/wallet.types'
import { LandingPage } from './index'

const ADDRESS = '0x1234567890abcdef1234567890abcdef12345678' as const

const WALLET_STATES: Array<[string, AppWalletState]> = [
  ['disconnected', { status: 'disconnected' }],
  ['connected', { status: 'connected', address: ADDRESS }],
  [
    'delegated',
    {
      status: 'delegated',
      address: ADDRESS,
      delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    },
  ],
]

describe.each<BackendShape>(['extended', 'legacy'])(
  'LandingPage once the pilot has ended (%s backend)',
  (shape) => {
    beforeEach(() => {
      server.use(...endedProgramHandlers(shape))
    })

    it.each(WALLET_STATES)('shows the pilot summary instead of the live round (%s)', async (_label, walletState) => {
      renderApp(<LandingPage />, { walletState })

      expect(await screen.findByText('Pilot complete')).toBeInTheDocument()
      expect(screen.getByText('18,000 ENS distributed over 3 rounds')).toBeInTheDocument()
      expect(screen.getByRole('link', { name: /Pilot complete/ })).toHaveAttribute('href', '/rounds')

      expect(screen.queryByText(/Live program/)).not.toBeInTheDocument()
      expect(screen.queryByText('active VP growth')).not.toBeInTheDocument()
      expect(screen.queryByText(/ENS pool$/)).not.toBeInTheDocument()
      expect(screen.queryByText('Rewards auto-sent')).not.toBeInTheDocument()
    })

    it('keeps the tier ladder static and marks the final round tier', async () => {
      renderApp(<LandingPage />)

      const table = await screen.findByTestId('tier-table')
      expect(within(table).queryByText('Current tier')).not.toBeInTheDocument()
      expect(within(table).queryByText('Locked')).not.toBeInTheDocument()
      expect(within(table).queryByText('Unlocked')).not.toBeInTheDocument()
      const finalRound = within(table).getByText('Final round')
      expect(finalRound.parentElement).toHaveTextContent('Tier #2')
      expect(within(table).getAllByText('Final round')).toHaveLength(1)
      expect(screen.queryByText(/Share & grow the pool/)).not.toBeInTheDocument()
    })

    it('drops reward promises from the hero and CTA copy', async () => {
      renderApp(<LandingPage />)

      expect(await screen.findByText(/for ENS governance/)).toBeInTheDocument()
      expect(screen.queryByText(/and earn rewards/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Rewards are automatic/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Earn ENS rewards/)).not.toBeInTheDocument()
      expect(screen.getByText(/Delegate your ENS\./)).toBeInTheDocument()
      // The delegate flow stays available.
      expect(screen.getByRole('link', { name: /Delegate now/ })).toHaveAttribute('href', '/voters')
    })
  },
)

describe('LandingPage while a round is live', () => {
  it('keeps the live round block and current tier', async () => {
    renderApp(<LandingPage />)

    expect(await screen.findByText('Round 3')).toBeInTheDocument()
    expect(screen.getByText(/Live program/)).toBeInTheDocument()
    expect(screen.getByText('active VP growth')).toBeInTheDocument()
    expect(screen.getByText('Rewards auto-sent')).toBeInTheDocument()
    expect(screen.getByText(/and earn rewards/)).toBeInTheDocument()
    expect(within(screen.getByTestId('tier-table')).getByText('Current tier')).toBeInTheDocument()
    expect(screen.queryByText('Pilot complete')).not.toBeInTheDocument()
    expect(screen.queryByText('Final round')).not.toBeInTheDocument()
  })
})
