import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { DelegatesPage } from './index'

describe('DelegatesPage', () => {
  it('renders page heading', () => {
    renderApp(<DelegatesPage />)
    expect(
      screen.getByText('Delegate to someone who shows up'),
    ).toBeInTheDocument()
  })

  it('renders stats bar with delegate count from fixture', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
    expect(screen.getByText('Active Delegates')).toBeInTheDocument()
  })

  it('renders delegate cards after loading', async () => {
    renderApp(<DelegatesPage />)
    await waitFor(() => {
      expect(screen.getByText('0x1234…5678')).toBeInTheDocument()
    })
    expect(screen.getByText('0xabcd…abcd')).toBeInTheDocument()
    expect(screen.getByText('')).toBeInTheDocument()
  })

  it('renders sort controls', () => {
    renderApp(<DelegatesPage />)
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText(/Random/)).toBeInTheDocument()
  })
})
