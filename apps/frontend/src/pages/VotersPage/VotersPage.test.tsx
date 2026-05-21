import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: true, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
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
      expect(screen.getByText('38')).toBeInTheDocument()
    })
    expect(screen.getByText('active voters')).toBeInTheDocument()
    expect(screen.getByText('1.3M')).toBeInTheDocument()
    expect(screen.getByText('ENS delegated to active voters')).toBeInTheDocument()
    expect(screen.getByText('412')).toBeInTheDocument()
    expect(screen.getByText('wallets earning')).toBeInTheDocument()
  })

  it('renders voter cards after loading', async () => {
    renderApp(<VotersPage />)
    await waitFor(() => {
      expect(screen.getAllByText('nick.eth').length).toBeGreaterThan(0)
    })
    expect(screen.getAllByText('avsa.eth').length).toBeGreaterThan(0)
    expect(screen.getAllByText('slobo.eth').length).toBeGreaterThan(0)
  })

  it('renders sort controls', () => {
    renderApp(<VotersPage />)
    expect(screen.getByText('Voting Power')).toBeInTheDocument()
    expect(screen.getByText('Activity')).toBeInTheDocument()
    expect(screen.getByText(/Random/)).toBeInTheDocument()
  })

  it('filters by reverse-resolved ENS name even when ensName is null in the API response', async () => {
    renderApp(<VotersPage />)

    await waitFor(() => {
      expect(screen.getByLabelText('Search voters')).toBeInTheDocument()
    })

    const search = screen.getByLabelText('Search voters')
    await userEvent.type(search, 'nameless')

    await waitFor(() => {
      expect(screen.getByText(/0x6f7a…4f5a/i)).toBeInTheDocument()
    })

    expect(screen.queryByText('nick.eth')).not.toBeInTheDocument()
  })
})
