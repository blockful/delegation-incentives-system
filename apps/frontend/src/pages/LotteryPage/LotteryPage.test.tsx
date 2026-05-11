import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'
import { LotteryPage } from '.'

describe('LotteryPage', () => {
  it('renders lottery heading', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(
        screen.getByText('Lottery buckets'),
      ).toBeInTheDocument()
    })
  })

  it('renders total lottery prize amount', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('Total lottery prizes')).toBeInTheDocument()
    })
    const prizeAmounts = screen.getAllByText('10 ENS')
    expect(prizeAmounts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders "how the draw works"', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('How the draw works')).toBeInTheDocument()
    })
    expect(
      screen.getByText(/weighted by the original sub-1 ENS amount/),
    ).toBeInTheDocument()
  })
})
