import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'
import { DashboardPage } from '.'

const CONNECTED_WALLET = {
  status: 'connected' as const,
  address: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
}

describe('DashboardPage', () => {
  it('does not render dashboard content when disconnected', () => {
    renderApp(<DashboardPage />)
    expect(screen.queryByText(/% APR/)).not.toBeInTheDocument()
  })

  it('renders the not-earning hero when connected but not delegated', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText(/3\.95% APR/)).toBeInTheDocument()
    })
    expect(screen.getByText('You’re not earning yet')).toBeInTheDocument()
    expect(screen.getByText('Not delegating yet')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Pick a delegate/ }),
    ).toBeInTheDocument()
  })

  it('shows round progress', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getAllByText(/Round \d+/).length).toBeGreaterThan(0)
    })
  })

  it('renders the recent payouts section', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText('Recent Payouts')).toBeInTheDocument()
    })
    expect(
      screen.getByRole('button', { name: /View all rounds/ }),
    ).toBeInTheDocument()
  })
})
