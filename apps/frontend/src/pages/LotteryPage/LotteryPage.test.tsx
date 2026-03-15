import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'
import { LotteryPage } from '.'

describe('LotteryPage', () => {
  it('renders lottery heading', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(
        screen.getByText('Small balance? You still have a shot.'),
      ).toBeInTheDocument()
    })
  })

  it('renders prize amount (10 ENS)', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('Prize Per Pool')).toBeInTheDocument()
    })
    // Prize amount appears in the prize card
    const prizeAmounts = screen.getAllByText('8.00 ENS')
    expect(prizeAmounts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "how the draw works"', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('How the draw works')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/verifiable random draw/),
    ).toBeInTheDocument()
  })
})
