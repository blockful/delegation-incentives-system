import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
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

  it('renders FAQ section with all 8 questions expanded', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByTestId('faq-section')).toBeInTheDocument()
    })

    const questions = [
      'Is delegating really free?',
      'Do I keep control of my tokens?',
      'How do I earn rewards?',
      'Am I eligible to earn?',
      'Do I need to do anything to earn the most?',
      'When and how do I get paid?',
      'What is the lottery?',
      'How are rewards calculated?',
    ]
    for (const question of questions) {
      expect(
        screen.getByRole('button', { name: question }),
      ).toHaveAttribute('aria-expanded', 'true')
    }
    // Answers are visible without any interaction (not a collapsed accordion).
    expect(
      screen.getByText(/Delegating only assigns your voting power/),
    ).toBeVisible()
  })

  it('FAQ free-gas answer interpolates the sponsorship threshold', async () => {
    // `useGasSponsorshipMinEns` reads the relayer config (MSW returns
    // minVotingPower=1e18 → '1') and falls back to the copy default while it
    // loads, so assert the sentence shape rather than a fixed number.
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(
        screen.getByText(/as long as you hold at least [\d.]+ ENS/),
      ).toBeInTheDocument()
    })
  })

  it('FAQ collapses an item when its question is clicked', async () => {
    renderApp(<LandingPage />)
    const question = await screen.findByRole('button', {
      name: 'Do I keep control of my tokens?',
    })
    expect(
      screen.getByText(/Delegating only assigns your voting power/),
    ).toBeInTheDocument()

    await userEvent.click(question)

    expect(question).toHaveAttribute('aria-expanded', 'false')
    expect(
      screen.queryByText(/Delegating only assigns your voting power/),
    ).not.toBeInTheDocument()
  })

  it('renders Ask us anything button linking to the ClickUp form', async () => {
    renderApp(<LandingPage />)
    await waitFor(() => {
      expect(screen.getByText(/Still have questions/)).toBeInTheDocument()
    })
    const link = screen.getByRole('link', { name: /Ask us anything/ })
    expect(link).toHaveAttribute(
      'href',
      'https://forms.clickup.com/90132341641/f/2ky4wrw9-32333/5X8NDK4X8TI3OTMQ73',
    )
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
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
