import { Route, Routes } from 'react-router-dom'
import { screen, waitFor } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import { RoundsPage } from './index'
import { RoundDetailPage } from './RoundDetailPage'

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
