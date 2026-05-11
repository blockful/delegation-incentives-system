import { Route, Routes } from 'react-router-dom'
import { screen, waitFor, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { renderApp, userEvent } from '@/test/utils'
import { server } from '@/test/mocks/server'
import {
  addressDistributionFixture,
  emptyRoundDetailFixture,
  roundListFixture,
} from '@/test/mocks/fixtures'
import { RoundsPage } from './index'
import { RoundDetailPage } from './RoundDetailPage'

const WALLET = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'

async function findSection(name: string) {
  const label = await screen.findByText(name)
  const section = label.closest('section')
  expect(section).not.toBeNull()
  return section!
}

describe('RoundsPage', () => {
  it('renders the current round heading and tier table', async () => {
    renderApp(<RoundsPage />)

    expect(await screen.findByRole('heading', { name: /Round 3 is live/i })).toBeInTheDocument()
    expect(screen.getByText('live')).toBeInTheDocument()

    const tierTable = await screen.findByTestId('tier-table')
    for (let i = 1; i <= 7; i++) {
      expect(within(tierTable).getByText(`Tier #${i}`)).toBeInTheDocument()
    }
  })

  it('renders UTC global round history without fake rewards', async () => {
    renderApp(<RoundsPage />)

    const history = await findSection('Round History')
    await waitFor(() => {
      expect(within(history).getByRole('link', { name: 'Round 3' })).toBeInTheDocument()
    })

    const currentRoundRow = within(history)
      .getAllByRole('row')
      .find((row) => within(row).queryByRole('link', { name: 'Round 3' }))

    expect(currentRoundRow).toBeDefined()
    expect(within(currentRoundRow!).getByText('May 1–31, 2026')).toBeInTheDocument()
    expect(within(currentRoundRow!).queryByText('Apr 30')).not.toBeInTheDocument()
    expect(within(currentRoundRow!).getByText('5,000 ENS')).toBeInTheDocument()
    expect(within(currentRoundRow!).getByText('0%')).toBeInTheDocument()
    expect(within(currentRoundRow!).getByText('Pending')).toBeInTheDocument()
    expect(within(currentRoundRow!).getByText('No address')).toBeInTheDocument()
    expect(within(history).queryByText('Distributed')).not.toBeInTheDocument()
    expect(within(history).queryByText('Tier')).not.toBeInTheDocument()
    expect(within(history).queryByText('Status')).not.toBeInTheDocument()

    expect(within(history).getByText('Apr 1–30, 2026')).toBeInTheDocument()
    expect(within(history).getByText('1 winners / 2 entries')).toBeInTheDocument()
    expect(within(history).getByText('Mar 1–31, 2026')).toBeInTheDocument()
    expect(screen.queryByText('+12.3456 ENS')).not.toBeInTheDocument()
  })

  it('formats the current round pool and progress from round data', async () => {
    server.use(
      http.get('/api/rounds', () =>
        HttpResponse.json({
          ...roundListFixture,
          rounds: roundListFixture.rounds.map((round) =>
            round.roundNumber === 3
              ? { ...round, percentComplete: 48 }
              : round,
          ),
        }),
      ),
    )

    renderApp(<RoundsPage />)

    const poolStat = (await screen.findAllByText('Pool'))[0]
    expect(within(poolStat.closest('div')!).getByText('5,000 ENS')).toBeInTheDocument()

    const status = await screen.findByRole('status', {
      name: /round 3 is in progress/i,
    })
    expect(status).toHaveTextContent(/in progress/i)

    const progress = screen.getByRole('progressbar', { name: /round 3 progress/i })
    expect(progress).toHaveAttribute('aria-valuenow', '48')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
  })

  it('uses the connected wallet for address-specific rewards', async () => {
    renderApp(<RoundsPage />, {
      walletState: { status: 'connected', address: WALLET },
    })

    const history = await findSection('Round History')
    await waitFor(() => {
      expect(within(history).getByText('+35 ENS')).toBeInTheDocument()
    })

    expect(within(history).getByText('Apr 1–30, 2026')).toBeInTheDocument()
    expect(within(history).getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.queryByText('Address Rewards')).not.toBeInTheDocument()
  })

  it('allows inspecting an entered address without a connected wallet', async () => {
    renderApp(<RoundsPage />)

    await userEvent.type(await screen.findByLabelText('Wallet address'), WALLET)
    await userEvent.click(screen.getByRole('button', { name: 'Inspect' }))

    const history = await findSection('Round History')
    await waitFor(() => {
      expect(within(history).getByText('+35 ENS')).toBeInTheDocument()
    })
  })

  it('does not fake address rewards when the API has no distribution data', async () => {
    server.use(
      http.get('/api/distributions', ({ request }) => {
        const url = new URL(request.url)
        if (!url.searchParams.has('address')) return HttpResponse.json([])

        return HttpResponse.json({
          address: WALLET,
          rounds: addressDistributionFixture.rounds.map((round) => ({
            ...round,
            rewardStatus: round.roundNumber === 3 ? 'pending' : 'unavailable',
            totalRewardEns: '0.000000000000000000',
          })),
        })
      }),
    )

    renderApp(<RoundsPage />, {
      walletState: { status: 'connected', address: WALLET },
    })

    const history = await findSection('Round History')
    await waitFor(() => {
      expect(within(history).getAllByText('Unavailable').length).toBeGreaterThan(0)
    })
    expect(screen.queryByText('+35 ENS')).not.toBeInTheDocument()
  })

  it('makes round rows clickable', async () => {
    renderApp(<RoundsPage />)

    const history = await findSection('Round History')
    const roundLink = await within(history).findByRole('link', { name: 'Round 2' })

    expect(roundLink).toHaveAttribute('href', '/rounds/2')
  })

  it('does not label an ended-only round as in progress', async () => {
    server.use(
      http.get('/api/rounds', () =>
        HttpResponse.json({
          currentRoundNumber: null,
          rounds: [
            {
              ...roundListFixture.rounds[1],
              isCurrent: false,
              status: 'paid',
              percentComplete: 100,
              daysRemaining: 0,
            },
          ],
        }),
      ),
    )

    renderApp(<RoundsPage />)

    expect(await screen.findByRole('heading', { name: /Round 2 is paid/i })).toBeInTheDocument()
    expect(screen.getByRole('status', { name: /round 2 is paid/i })).toHaveTextContent('Paid')
    expect(screen.queryByText('In progress')).not.toBeInTheDocument()
  })

  it('falls back to truthful row states for an empty address history', async () => {
    server.use(
      http.get('/api/distributions', () =>
        HttpResponse.json({
          address: WALLET,
          rounds: [],
        }),
      ),
    )

    renderApp(<RoundsPage />, {
      walletState: { status: 'connected', address: WALLET },
    })

    const history = await findSection('Round History')
    await waitFor(() => {
      expect(within(history).getAllByText('Pending').length).toBeGreaterThan(0)
    })
    expect(within(history).getAllByText('Unavailable').length).toBeGreaterThan(0)
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

  it('renders populated round detail rankings and address reward', async () => {
    renderDetail(`/rounds/2?address=${WALLET}`)

    expect(await screen.findByRole('heading', { name: 'Round 2' })).toBeInTheDocument()
    expect(screen.getByText('Apr 1–30, 2026')).toBeInTheDocument()
    expect(screen.getByText('8,000 ENS')).toBeInTheDocument()
    expect(screen.getByText('+20%')).toBeInTheDocument()
    expect(screen.getByText('155 ENS')).toBeInTheDocument()
    expect(screen.getAllByText('35 ENS').length).toBeGreaterThan(0)
    expect(screen.getByText('Direct Payout Holders')).toBeInTheDocument()
    expect(screen.getByText('Lottery Prize')).toBeInTheDocument()
    expect(screen.getByText('Lottery Results')).toBeInTheDocument()
    expect(screen.getAllByText('Lottery Entries').length).toBeGreaterThan(0)
    expect(screen.getByText('Ethereum prevRandao')).toBeInTheDocument()
    expect(screen.getByText('keccak256(prevRandao, bucketIndex)')).toBeInTheDocument()
    expect(screen.getByText('#24,996,367')).toBeInTheDocument()
    expect(screen.getAllByText('75%').length).toBeGreaterThan(0)
    expect(screen.getByText('7.5 ENS')).toBeInTheDocument()
    expect(screen.getByText('Delegate Rewards')).toBeInTheDocument()
    expect(screen.getByText('Token Holder Rewards')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Previous round' })).toHaveAttribute(
      'href',
      `/rounds/1?address=${WALLET}`,
    )
    expect(screen.getByRole('link', { name: 'Next round' })).toHaveAttribute(
      'href',
      `/rounds/3?address=${WALLET}`,
    )
    expect(screen.getByText('delegate.eth')).toBeInTheDocument()
    expect(screen.getByText('rank-eleven.eth')).toBeInTheDocument()
    expect(screen.getAllByText('holder-eleven.eth').length).toBeGreaterThan(0)
    expect(screen.getAllByText('2 recipients')).toHaveLength(2)
    expect(screen.queryByText('Type')).not.toBeInTheDocument()
    expect(screen.queryByText('Metadata')).not.toBeInTheDocument()
  })

  it('renders clean empty states on a round without distribution data', async () => {
    server.use(
      http.get('/api/rounds/:roundNumber', () =>
        HttpResponse.json(emptyRoundDetailFixture),
      ),
    )

    renderDetail(`/rounds/3?address=${WALLET}`)

    expect(await screen.findByRole('heading', { name: 'Round 3' })).toBeInTheDocument()
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.getAllByText('No distribution data.')).toHaveLength(2)
    expect(screen.getByText('No lottery data.')).toBeInTheDocument()
    expect(screen.getByText('No lottery entries.')).toBeInTheDocument()
  })

  it('renders a useful invalid round state', async () => {
    renderDetail('/rounds/abc')

    expect(await screen.findByText('Unknown round.')).toBeInTheDocument()
  })
})
