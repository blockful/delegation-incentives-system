import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'
import { TransparencyPage } from '.'

describe('TransparencyPage', () => {
  it('renders heading', () => {
    renderApp(<TransparencyPage />)
    expect(
      screen.getByText('Verify everything on-chain'),
    ).toBeInTheDocument()
  })

  it('renders 3 verify links', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('GitHub')).toBeInTheDocument()
    expect(screen.getByText('Anticapture')).toBeInTheDocument()
    expect(screen.getByText('Dune Analytics')).toBeInTheDocument()
  })

  it('renders 3 smart contracts with Verified badges', () => {
    renderApp(<TransparencyPage />)
    expect(screen.getByText('ENS Incentives')).toBeInTheDocument()
    expect(screen.getByText('Delegate By Sig')).toBeInTheDocument()
    expect(screen.getByText('Reward Distributor')).toBeInTheDocument()

    const verifiedTags = screen.getAllByText('Verified')
    expect(verifiedTags).toHaveLength(3)
  })

  it('renders how rewards calculated steps', async () => {
    renderApp(<TransparencyPage />)
    expect(
      screen.getByText('How rewards are calculated'),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/180-day moving average/)).toBeInTheDocument()
    })
    expect(screen.getByText(/Month-over-month growth/)).toBeInTheDocument()
    expect(screen.getByText(/proportional to your share/)).toBeInTheDocument()
  })
})
