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
    expect(screen.queryByText('Your Earnings')).not.toBeInTheDocument()
  })

  it('renders earnings when connected', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText('Your Earnings')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/\+16\.35/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows APY data', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText(/5\.75% APY/)).toBeInTheDocument()
    })
  })

  it('renders tier table with reward tiers', async () => {
    renderApp(<DashboardPage />, { walletState: CONNECTED_WALLET })
    await waitFor(() => {
      expect(screen.getByText('Reward Tiers')).toBeInTheDocument()
    })
  })
})
