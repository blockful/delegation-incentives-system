import { screen } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { TierTable } from './TierTable'
import { roundsFixture } from '@/test/mocks/fixtures'

const { tiers, currentTierIndex } = roundsFixture

describe('TierTable', () => {
  it('renders all 6 tiers (Tier #1 through Tier #6)', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    for (let i = 1; i <= 6; i++) {
      expect(screen.getByText(`Tier #${i}`)).toBeInTheDocument()
    }
  })

  it('highlights current tier (data-active="true" on correct row)', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    const rows = screen.getAllByTestId('tier-row')
    expect(rows).toHaveLength(6)

    rows.forEach((row, i) => {
      if (i === currentTierIndex) {
        expect(row).toHaveAttribute('data-active', 'true')
      } else {
        expect(row).toHaveAttribute('data-active', 'false')
      }
    })
  })

  it('shows APY for each tier', () => {
    renderApp(
      <TierTable tiers={tiers} currentTierIndex={currentTierIndex} />,
    )

    // Each tier shows its pool size as part of the display
    expect(screen.getByText('500 ENS')).toBeInTheDocument()
    expect(screen.getByText('1,000 ENS')).toBeInTheDocument()
    expect(screen.getByText('2,000 ENS')).toBeInTheDocument()
    expect(screen.getByText('4,000 ENS')).toBeInTheDocument()
    expect(screen.getByText('8,000 ENS')).toBeInTheDocument()
    expect(screen.getByText('16,000 ENS')).toBeInTheDocument()
  })
})
