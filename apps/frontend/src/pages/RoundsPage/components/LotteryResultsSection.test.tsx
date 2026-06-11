import { screen, within } from '@testing-library/react'
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
      entries: [
        {
          bucketIndex: 0,
          entryIndex: 1,
          address: WINNER_ONE,
          ensName: 'myname.eth',
          amount: '620000000000000000',
          amountEns: '0.620000000000000000',
          probability: '0.0620',
        },
        {
          bucketIndex: 0,
          entryIndex: 2,
          address: '0x1111111111111111111111111111111111111111',
          ensName: 'coltron.eth',
          amount: '490000000000000000',
          amountEns: '0.490000000000000000',
          probability: '0.0480',
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

    const winners = screen.getByTestId('lottery-stat-winners')
    expect(within(winners).getByText('2')).toBeInTheDocument()
    expect(within(winners).getByText('winners')).toBeInTheDocument()
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

  it('expands the first pool by default with participants, odds and winner badge', () => {
    renderApp(<LotteryResultsSection lottery={lotteryFixture} />)

    expect(screen.getByRole('button', { name: /Pool #1/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    const participantsTable = screen.getByTestId('lottery-pool-participants-0')
    expect(within(participantsTable).getByText('Winner')).toBeInTheDocument()
    expect(within(participantsTable).getByText('coltron.eth')).toBeInTheDocument()
    expect(within(participantsTable).getByText('6.2%')).toBeInTheDocument()
    expect(within(participantsTable).getByText('0.62 ENS')).toBeInTheDocument()
    // Odds-not-prize nuance is spelled out in the expanded body
    expect(
      screen.getByText(/a bigger entry buys better odds, not a bigger prize/i),
    ).toBeInTheDocument()
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
})
