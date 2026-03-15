import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { LandingPage } from './index'

describe('LandingPage', () => {
  it('renders hero heading when disconnected', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/Your ENS is sitting idle/),
      ).toBeInTheDocument()
    })
  })

  it('renders tier table with 7 tiers', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('Tier #1')).toBeInTheDocument()
    })
    expect(screen.getByText('Tier #2')).toBeInTheDocument()
    expect(screen.getByText('Tier #3')).toBeInTheDocument()
    expect(screen.getByText('Tier #4')).toBeInTheDocument()
    expect(screen.getByText('Tier #5')).toBeInTheDocument()
    expect(screen.getByText('Tier #6')).toBeInTheDocument()
    expect(screen.getByText('Tier #7')).toBeInTheDocument()
  })

  it('renders how it works section', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/Simple to join\. Better when more people do\./),
      ).toBeInTheDocument()
    })
  })

  it('renders CTA section', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/Earn ENS rewards/),
      ).toBeInTheDocument()
    })
  })

  it('shows current APY in hero from tier data', async () => {
    // Fixture: maxDelegatorApyPct='5400.00'
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText('5400.00% APY')).toBeInTheDocument()
    })
  })

  it('renders landing when wallet is connected', async () => {
    renderApp(<LandingPage />, {
      walletState: { status: 'connected', address: '0x1234567890abcdef1234567890abcdef12345678' },
    })
    await waitFor(() => {
      expect(
        screen.getByText(/Your ENS is sitting idle/),
      ).toBeInTheDocument()
    })
  })

  it('renders landing when wallet is delegated', async () => {
    renderApp(<LandingPage />, {
      walletState: {
        status: 'delegated',
        address: '0x1234567890abcdef1234567890abcdef12345678',
        delegatedTo: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      },
    })
    await waitFor(() => {
      expect(
        screen.getByText(/Your ENS is sitting idle/),
      ).toBeInTheDocument()
    })
  })
})
