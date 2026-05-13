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

  it('renders the selected bucket prize amount', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('Round 2 · Bucket #1 details')).toBeInTheDocument()
    })
    const prizeAmounts = screen.getAllByText('10 ENS')
    expect(prizeAmounts.length).toBeGreaterThanOrEqual(1)
  })

  it('renders simple lottery conditions', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('Entry')).toBeInTheDocument()
    })
    expect(screen.getAllByText('Chance').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Draw')).toBeInTheDocument()
  })

  it('shows the selected round and bucket participants with odds and ENS shares', async () => {
    renderApp(<LotteryPage />, { initialPath: '/lottery?round=2&bucket=1' })

    await waitFor(() => {
      expect(screen.getByText('Round 2 · Bucket #1 details')).toBeInTheDocument()
    })

    expect(screen.getByText('Choose lottery')).toBeInTheDocument()
    expect(screen.getAllByText('Winner').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Participants').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ENS share')).toBeInTheDocument()
    expect(screen.getByText('0.99 ENS')).toBeInTheDocument()
    expect(screen.getByText('0.94 ENS')).toBeInTheDocument()
    expect(screen.getAllByText('9.9%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('9.4%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Won 10 ENS')).toBeInTheDocument()
    expect(screen.getByText('holder-eleven.eth')).toBeInTheDocument()
  })
})
