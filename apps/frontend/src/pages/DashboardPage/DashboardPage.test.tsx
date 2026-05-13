import { screen, waitFor, within } from '@testing-library/react'
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
    expect(screen.queryByText(/% APY/)).not.toBeInTheDocument()
  })

  it('renders earnings when connected', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText(/3\.95% APY/)).toBeInTheDocument()
    })
    const earnings = screen.getByLabelText('Your rewards')
    expect(within(earnings).getByText(/\+\d+(\.\d)?/)).toBeInTheDocument()
    expect(screen.getByText('ENS earned so far')).toBeInTheDocument()
  })

  it('shows round progress', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getAllByText(/Round \d+/).length).toBeGreaterThan(0)
    })
  })

  it('renders reward tiers table', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText('Reward Tiers')).toBeInTheDocument()
    })
  })
})
