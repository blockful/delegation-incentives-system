import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { LandingPage } from './index'

describe('LandingPage', () => {
  it('renders hero heading when disconnected', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/on your ENS/),
      ).toBeInTheDocument()
    })
  })

  it('renders tier table with 7 tiers', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByTestId('tier-table')).toBeInTheDocument()
    })
    for (let i = 1; i <= 7; i++) {
      expect(screen.getAllByText(`Tier #${i}`).length).toBeGreaterThanOrEqual(1)
    }
  })

  it('renders how it works section', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/Simple to join/),
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

  it('shows current APR in hero from tier data', async () => {
    // MSW fixture (`src/test/mocks/fixtures/rounds.ts`) returns
    // maxTokenHolderAprPct='5400.00'. `formatHeroApr` in HeroSection caps
    // anything >=1000 at the literal '>1000%'.
    const { container } = renderApp(<LandingPage />)
    await waitFor(() => {
      expect(container.textContent).toMatch(/>1000% APR/)
    })
  })

  it('renders landing when wallet is connected', async () => {
    renderApp(<LandingPage />, {
      walletState: { status: 'connected', address: '0x1234567890abcdef1234567890abcdef12345678' },
    })
    await waitFor(() => {
      expect(
        screen.getByText(/on your ENS/),
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
        screen.getByText(/on your ENS/),
      ).toBeInTheDocument()
    })
  })
})
