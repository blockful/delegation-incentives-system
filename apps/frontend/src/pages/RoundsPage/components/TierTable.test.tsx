import { screen, within } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { TierTable } from './TierTable'
import { roundsFixture } from '@/test/mocks/fixtures'

const { tiers, currentTierIndex } = roundsFixture

describe('TierTable', () => {
  it('renders all 7 tiers (Tier #1 through Tier #7)', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    for (let i = 1; i <= 7; i++) {
      expect(screen.getByText(`Tier #${i}`)).toBeInTheDocument()
    }
  })

  it('renders all tiers in the tier table', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    const tierTable = screen.getByTestId('tier-table')
    expect(within(tierTable).getAllByText(/Tier #\d+/)).toHaveLength(7)
  })

  it('shows APR for each tier', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    expect(screen.getByText('~4.80% APR')).toBeInTheDocument()
    expect(screen.getByText('~8.64% APR')).toBeInTheDocument()
    expect(screen.getByText('~15.65% APR')).toBeInTheDocument()
    expect(screen.getByText('~27.00% APR')).toBeInTheDocument()
    expect(screen.getByText('~46.29% APR')).toBeInTheDocument()
    expect(screen.getByText('~80.00% APR')).toBeInTheDocument()
    expect(screen.getByText('~120.00% APR')).toBeInTheDocument()
  })
})
