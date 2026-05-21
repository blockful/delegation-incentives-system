import { screen, waitFor } from '@testing-library/react'
import { renderApp } from '@/test/utils'
import { VotersPage } from './index'

describe('VotersPage', () => {
  it('renders page heading', () => {
    renderApp(<VotersPage />)
    expect(
      screen.getByText('Pick an active voter. Earn ENS automatically.'),
    ).toBeInTheDocument()
  })

  it('renders stats bar fields from /stats fixture', async () => {
    renderApp(<VotersPage />)
    await waitFor(() => {
      expect(screen.getByText('47')).toBeInTheDocument()
    })
    expect(screen.getByText('active voters')).toBeInTheDocument()
    expect(screen.getByText('1.3M')).toBeInTheDocument()
    expect(screen.getByText('ENS delegated to active voters')).toBeInTheDocument()
    expect(screen.getByText('412')).toBeInTheDocument()
    expect(screen.getByText('wallets earning')).toBeInTheDocument()
  })

  it('renders voter cards after loading', async () => {
    renderApp(<VotersPage />)
    // The truncated address appears twice per card (display name + address
    // line), so use getAllByText and assert each set has at least one entry.
    await waitFor(() => {
      expect(screen.getAllByText('0x1234…5678').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('0xabcd…abcd').length).toBeGreaterThan(0)
    expect(screen.getAllByText('0x9876…5432').length).toBeGreaterThan(0)
  })

  it('renders sort controls', () => {
    renderApp(<VotersPage />)
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText(/Random/)).toBeInTheDocument()
  })
})
