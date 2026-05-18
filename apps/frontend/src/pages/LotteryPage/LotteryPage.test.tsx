import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/utils'
import { LotteryPage } from '.'

describe('LotteryPage', () => {
  it('renders the Lottery eyebrow', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getByText('Lottery')).toBeInTheDocument()
    })
  })

  it('renders prize amounts and the focused pool participants by default', async () => {
    renderApp(<LotteryPage />)
    await waitFor(() => {
      expect(screen.getAllByText(/Everyone in this pool/i).length).toBeGreaterThanOrEqual(1)
    })
    const prizeAmounts = screen.getAllByText('10 ENS')
    expect(prizeAmounts.length).toBeGreaterThanOrEqual(1)
  })

  it('shows the selected round and pool participants with odds and ENS shares', async () => {
    renderApp(<LotteryPage />, { initialPath: '/lottery?round=2&bucket=1' })

    await waitFor(() => {
      expect(screen.getAllByText(/Everyone in this pool/i).length).toBeGreaterThanOrEqual(1)
    })

    expect(screen.getAllByText('Winner').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Share')).toBeInTheDocument()
    expect(screen.getByText('0.99 ENS')).toBeInTheDocument()
    expect(screen.getByText('0.94 ENS')).toBeInTheDocument()
    expect(screen.getAllByText('9.9%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('9.4%').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Won 10 ENS')).toBeInTheDocument()
    expect(screen.getByText('holder-eleven.eth')).toBeInTheDocument()
  })
})
