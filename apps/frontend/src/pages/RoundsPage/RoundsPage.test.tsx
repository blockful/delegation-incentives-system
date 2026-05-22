import { vi } from 'vitest'

vi.mock('@/config/env', () => ({
  env: { useMockApi: true, apiBaseUrl: '/api', reownProjectId: 'test' },
}))

import { Route, Routes, useSearchParams } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { RoundsPage } from './index'
import { RoundDetailPage } from './RoundDetailPage'

function UrlProbe() {
  const [params] = useSearchParams()
  return <div data-testid="probe-address">{params.get('address') ?? ''}</div>
}

const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

describe('RoundsPage', () => {
  it('renders the current round heading', async () => {
    renderApp(<RoundsPage />)

    expect(
      await screen.findByRole('heading', { level: 1, name: /Round 3/i }),
    ).toBeInTheDocument()
  })

  it('renders a row per round from the fixture', async () => {
    renderApp(<RoundsPage />)

    await waitFor(() => {
      // Round number cells appear once per row
      expect(screen.getByText('Round 3')).toBeInTheDocument()
    })
    expect(screen.getByText('Round 2')).toBeInTheDocument()
    expect(screen.getByText('Round 1')).toBeInTheDocument()
  })

  it('exposes the address inspector', async () => {
    renderApp(<RoundsPage />)

    expect(
      await screen.findByLabelText('Search by ENS name or address'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument()
  })

  it('flags invalid addresses entered into the inspector', async () => {
    renderApp(<RoundsPage />)

    const input = await screen.findByLabelText('Search by ENS name or address')
    await userEvent.type(input, 'not-an-address')
    await userEvent.click(screen.getByRole('button', { name: /Search/i }))

    await waitFor(() => {
      expect(screen.getByText('Invalid address')).toBeInTheDocument()
    })
  })

  it('resolves an ENS name and pushes the resolved address into the URL', async () => {
    renderApp(
      <>
        <RoundsPage />
        <UrlProbe />
      </>,
      { initialPath: '/rounds' },
    )

    const input = await screen.findByLabelText('Search by ENS name or address')
    await userEvent.type(input, 'nick.eth')
    await userEvent.click(screen.getByRole('button', { name: /Search/i }))

    await waitFor(() => {
      expect(screen.getByTestId('probe-address')).toHaveTextContent(
        '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      )
    })
    expect(screen.queryByText("Couldn't resolve nick.eth")).not.toBeInTheDocument()
  })

  it('surfaces a friendly error for an ENS name that does not resolve', async () => {
    renderApp(
      <>
        <RoundsPage />
        <UrlProbe />
      </>,
      { initialPath: '/rounds' },
    )

    const input = await screen.findByLabelText('Search by ENS name or address')
    await userEvent.type(input, 'definitely-not-real.eth')
    await userEvent.click(screen.getByRole('button', { name: /Search/i }))

    await waitFor(() => {
      expect(
        screen.getByText("Couldn't resolve definitely-not-real.eth"),
      ).toBeInTheDocument()
    })
    expect(screen.getByTestId('probe-address')).toHaveTextContent('')
  })
})

describe('RoundDetailPage', () => {
  function renderDetail(path: string) {
    return renderApp(
      <Routes>
        <Route path="/rounds/:roundNumber" element={<RoundDetailPage />} />
      </Routes>,
      { initialPath: path },
    )
  }

  it('renders a populated round header for round 2', async () => {
    renderDetail(`/rounds/2?address=${WALLET}`)

    expect(
      await screen.findByRole('heading', { name: 'Round 2' }),
    ).toBeInTheDocument()
  })

  it('renders a useful invalid round state', async () => {
    renderDetail('/rounds/abc')

    expect(await screen.findByText('Unknown round.')).toBeInTheDocument()
  })
})
