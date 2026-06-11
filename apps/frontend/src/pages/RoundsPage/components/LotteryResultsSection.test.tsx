import { fireEvent, screen, within } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import type { LotteryDetail } from '@/api/types'
import { LotteryResultsSection } from './LotteryResultsSection'

const WINNER_ONE = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
const WINNER_TWO = '0x2222222222222222222222222222222222222222'

const lotteryFixture: LotteryDetail = {
  seed: {
    source: 'ethereum_prev_randao',
    label: 'Ethereum prevRandao',
    value: '0xabc0000000000000000000000000000000000000000000000000000000000000',
    blockNumber: '24996367',
    algorithm: 'keccak256(prevRandao, bucketIndex)',
  },
  bucketTarget: '10000000000000000000',
  bucketTargetEns: '10.000000000000000000',
  totalPrize: '20000000000000000000',
  totalPrizeEns: '20.000000000000000000',
  bucketCount: 2,
  entryCount: 4,
  participantCount: 4,
  winnerCount: 2,
  buckets: [
    {
      bucketIndex: 0,
      prize: '10000000000000000000',
      prizeEns: '10.000000000000000000',
      winner: WINNER_ONE,
      winnerEnsName: 'myname.eth',
      winnerProbability: '0.0620',
      entryCount: 2,
      // Deliberately unsorted: the section orders participants by entry size.
      entries: [
        {
          bucketIndex: 0,
          entryIndex: 2,
          address: '0x1111111111111111111111111111111111111111',
          ensName: 'coltron.eth',
          amount: '490000000000000000',
          amountEns: '0.490000000000000000',
          probability: '0.0480',
        },
        {
          bucketIndex: 0,
          entryIndex: 1,
          address: WINNER_ONE,
          ensName: 'myname.eth',
          amount: '620000000000000000',
          amountEns: '0.620000000000000000',
          probability: '0.0620',
        },
      ],
    },
    {
      bucketIndex: 1,
      prize: '9980000000000000000',
      prizeEns: '9.980000000000000000',
      winner: WINNER_TWO,
      winnerEnsName: 'katherine.eth',
      winnerProbability: '0.0510',
      entryCount: 2,
      entries: [
        {
          bucketIndex: 1,
          entryIndex: 1,
          address: WINNER_TWO,
          ensName: 'katherine.eth',
          amount: '510000000000000000',
          amountEns: '0.510000000000000000',
          probability: '0.0510',
        },
        {
          bucketIndex: 1,
          entryIndex: 2,
          address: '0x3333333333333333333333333333333333333333',
          ensName: 'spencecoin.eth',
          amount: '360000000000000000',
          amountEns: '0.360000000000000000',
          probability: '0.0350',
        },
      ],
    },
  ],
}

// One pool with seven entries — enough to overflow the five-row participants
// viewport and mount the scroll affordances. Amounts descend so the sorted
// order matches the entry indices.
const bigPoolLottery: LotteryDetail = {
  ...lotteryFixture,
  bucketCount: 1,
  entryCount: 7,
  participantCount: 7,
  winnerCount: 1,
  buckets: [
    {
      bucketIndex: 0,
      prize: '10000000000000000000',
      prizeEns: '10.000000000000000000',
      winner: '0x1111111111111111111111111111111111111111',
      winnerEnsName: 'entry-1.eth',
      winnerProbability: '0.0700',
      entryCount: 7,
      entries: Array.from({ length: 7 }, (_, i) => ({
        bucketIndex: 0,
        entryIndex: i + 1,
        address: `0x${String(i + 1).repeat(40)}`,
        ensName: `entry-${i + 1}.eth`,
        amount: `${7 - i}00000000000000000`,
        amountEns: `0.${7 - i}00000000000000000`,
        probability: `0.0${7 - i}00`,
      })),
    },
  ],
}

describe('LotteryResultsSection', () => {
  it('renders nothing when the round has no lottery data', () => {
    const { container } = renderApp(<LotteryResultsSection lottery={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the section header and overview stat chips', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    expect(screen.getByText('Pool prizes for small rewards')).toBeInTheDocument()
    expect(
      screen.getByText(/Rewards under 1 ENS go into shared pools of about 10 ENS/),
    ).toBeInTheDocument()
    const pools = screen.getByTestId('lottery-stat-pools')
    expect(within(pools).getByText('2')).toBeInTheDocument()
    expect(within(pools).getByText('Pools drawn')).toBeInTheDocument()

    const participants = screen.getByTestId('lottery-stat-participants')
    expect(within(participants).getByText('4')).toBeInTheDocument()
    expect(within(participants).getByText('participants')).toBeInTheDocument()

    // The design has exactly two chips — no "winners" chip.
    expect(screen.queryByTestId('lottery-stat-winners')).not.toBeInTheDocument()
  })

  it('explains the RANDAO draw and links Verify to the Etherscan block', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    expect(
      screen.getByText(
        /Winners were drawn from Ethereum block #24,996,367 using on-chain randomness \(RANDAO\)/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Verify/i })).toHaveAttribute(
      'href',
      'https://etherscan.io/block/24996367',
    )
  })

  it('renders one row per pool with winner, prize and entry count', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    const poolOne = screen.getByRole('button', { name: /Pool #1/i })
    expect(within(poolOne).getByText('myname.eth')).toBeInTheDocument()
    expect(within(poolOne).getByText('10.00 ENS prize')).toBeInTheDocument()
    expect(within(poolOne).getByText('2 entries')).toBeInTheDocument()

    const poolTwo = screen.getByRole('button', { name: /Pool #2/i })
    expect(within(poolTwo).getByText('katherine.eth')).toBeInTheDocument()
    expect(within(poolTwo).getByText('9.98 ENS prize')).toBeInTheDocument()
  })

  it('renders every pool collapsed by default', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    expect(screen.getByRole('button', { name: /Pool #1/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.getByRole('button', { name: /Pool #2/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
    expect(screen.queryByTestId('lottery-pool-participants-0')).not.toBeInTheDocument()
    expect(screen.queryByTestId('lottery-pool-participants-1')).not.toBeInTheDocument()
  })

  it('shows participants, odds and winner badge once a pool is expanded', async () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    await userEvent.click(screen.getByRole('button', { name: /Pool #1/i }))

    expect(screen.getByRole('button', { name: /Pool #1/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const participantsTable = screen.getByTestId('lottery-pool-participants-0')
    expect(within(participantsTable).getByText('Winner')).toBeInTheDocument()
    expect(within(participantsTable).getByText('coltron.eth')).toBeInTheDocument()
    expect(within(participantsTable).getByText('6.2%')).toBeInTheDocument()
    expect(within(participantsTable).getByText('0.62 ENS')).toBeInTheDocument()
  })

  it('orders participants by entry size and shows only the table when expanded', async () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    await userEvent.click(screen.getByRole('button', { name: /Pool #1/i }))

    // Fixture lists coltron (0.49 ENS) first; the bigger entry renders on top.
    const participantsTable = screen.getByTestId('lottery-pool-participants-0')
    const names = within(participantsTable)
      .getAllByText(/(myname|coltron)\.eth/)
      .map((el) => el.textContent)
    expect(names).toEqual(['myname.eth', 'coltron.eth'])

    // Per design the expanded body holds the participants table only —
    // no slot grid, no odds explainer line.
    expect(
      screen.queryByRole('img', { name: /entry distribution/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText(/a bigger entry buys better odds/i),
    ).not.toBeInTheDocument()
  })

  it('expands a collapsed pool on click', async () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    const poolTwo = screen.getByRole('button', { name: /Pool #2/i })
    expect(poolTwo).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('spencecoin.eth')).not.toBeInTheDocument()

    await userEvent.click(poolTwo)

    expect(poolTwo).toHaveAttribute('aria-expanded', 'true')
    const participantsTable = screen.getByTestId('lottery-pool-participants-1')
    expect(within(participantsTable).getByText('spencecoin.eth')).toBeInTheDocument()
    expect(within(participantsTable).getByText('Winner')).toBeInTheDocument()
  })

  it('marks the viewer pool by membership even while collapsed', () => {
    // Upper-cased to prove the membership compare is case-insensitive.
    renderApp(
      <LotteryResultsSection
        lottery={lotteryFixture}
        highlightAddress={WINNER_ONE.toUpperCase()}
      />,
    )

    const poolOne = screen.getByRole('button', { name: /Pool #1/i })
    const poolTwo = screen.getByRole('button', { name: /Pool #2/i })
    // Membership, not expansion, drives the marker — the pool is still collapsed.
    expect(poolOne).toHaveAttribute('aria-expanded', 'false')
    expect(poolOne).toHaveAttribute('aria-current', 'true')
    expect(poolTwo).not.toHaveAttribute('aria-current')
  })

  it('does not mark a pool as the viewer pool just because it is expanded', async () => {
    renderApp(
      <LotteryResultsSection lottery={lotteryFixture} highlightAddress={WINNER_ONE} />,
    )

    const poolTwo = screen.getByRole('button', { name: /Pool #2/i })
    await userEvent.click(poolTwo)

    expect(poolTwo).toHaveAttribute('aria-expanded', 'true')
    expect(poolTwo).not.toHaveAttribute('aria-current')
  })

  it('marks no pool when there is no active address', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    expect(screen.getByRole('button', { name: /Pool #1/i })).not.toHaveAttribute(
      'aria-current',
    )
    expect(screen.getByRole('button', { name: /Pool #2/i })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('adds scroll affordances to pools with more than five entries', async () => {
    renderApp(<LotteryResultsSection lottery={bigPoolLottery} />)

    await userEvent.click(screen.getByRole('button', { name: /Pool #1/i }))

    // Every row mounts — overflow scrolls inside the viewport instead of paging.
    const viewport = screen.getByTestId('lottery-pool-viewport-0')
    expect(within(viewport).getByText('entry-7.eth')).toBeInTheDocument()
    expect(screen.getByText('7 total entries')).toBeInTheDocument()
    expect(screen.getByText('Scroll for more')).toBeInTheDocument()
  })

  it('keeps small pools free of scroll chrome', async () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    await userEvent.click(screen.getByRole('button', { name: /Pool #1/i }))

    expect(screen.getByTestId('lottery-pool-viewport-0')).toBeInTheDocument()
    expect(screen.queryByText(/total entries/)).not.toBeInTheDocument()
    expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument()
  })

  it('hides the scroll hint once the participant list is scrolled to the end', async () => {
    renderApp(<LotteryResultsSection lottery={bigPoolLottery} />)

    const poolButton = screen.getByRole('button', { name: /Pool #1/i })
    await userEvent.click(poolButton)
    expect(screen.getByText('Scroll for more')).toBeInTheDocument()

    // jsdom reports zero scroll dimensions, which reads as "at the end".
    fireEvent.scroll(screen.getByTestId('lottery-pool-viewport-0'))

    expect(screen.queryByText('Scroll for more')).not.toBeInTheDocument()
    expect(screen.getByText('7 total entries')).toBeInTheDocument()

    // Collapsing and re-expanding remounts the viewport scrolled to the top,
    // so the hint must come back.
    await userEvent.click(poolButton)
    await userEvent.click(poolButton)
    expect(screen.getByText('Scroll for more')).toBeInTheDocument()
  })
})
