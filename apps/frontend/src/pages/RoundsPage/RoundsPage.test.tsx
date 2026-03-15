import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { RoundsPage } from './index'

describe('RoundsPage', () => {
  it('renders round heading with live text', async () => {
    renderApp(<RoundsPage />)

    await waitFor(() => {
      expect(screen.getByText(/Round 2 is/)).toBeInTheDocument()
    })
    expect(screen.getByText('live')).toBeInTheDocument()
  })

  it('renders tier table with 7 tiers', async () => {
    renderApp(<RoundsPage />)

    await waitFor(() => {
      expect(screen.getAllByTestId('tier-row')).toHaveLength(7)
    })
  })

  it('renders round history section', async () => {
    renderApp(<RoundsPage />)

    await waitFor(() => {
      expect(screen.getByText('Round History')).toBeInTheDocument()
    })
    expect(screen.getByText('Round 3')).toBeInTheDocument()
    expect(screen.getAllByText('Paid').length).toBeGreaterThanOrEqual(1)
  })

  it('renders round card stats (pool size from fixture)', async () => {
    renderApp(<RoundsPage />)

    // currentTierIndex=1 → poolSizeEns='1000'
    await waitFor(() => {
      expect(screen.getByText('1000 ENS')).toBeInTheDocument()
    })
    expect(screen.getByText('12.40%')).toBeInTheDocument()
    // "Tier #2" appears in both card and table — verify at least one exists
    expect(screen.getAllByText('Tier #2').length).toBeGreaterThanOrEqual(1)
  })
})
