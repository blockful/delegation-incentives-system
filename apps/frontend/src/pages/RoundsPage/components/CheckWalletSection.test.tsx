import { vi } from 'vitest'
import { screen, within } from '@testing-library/react'
import { renderApp, userEvent } from '@/test/utils'
import type {
  AddressRoundReward,
  LotteryDetail,
  RoundDetailResponse,
} from '@/api/types'
import {
  CheckWalletSection,
  deriveCheckWalletView,
  findLostLotteryEntry,
} from './CheckWalletSection'

const WALLET = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'
const OTHER_WALLET = '0x1111111111111111111111111111111111111111'
const WINNER = '0x2222222222222222222222222222222222222222'

const baseRound: RoundDetailResponse = {
  roundNumber: 2,
  month: '2026-04',
  startDate: '2026-04-01T00:00:00.000Z',
  endDate: '2026-04-30T23:59:59.999Z',
  status: 'paid',
  distributionDataStatus: 'available',
  isCurrent: false,
  percentComplete: 100,
  daysRemaining: 0,
  tierIndex: 0,
  tierLabel: 'Tier 1',
  vpGrowthPct: '1.25',
  poolSize: '50000000000000000000000',
  poolSizeEns: '50000.000000000000000000',
  totalDistributed: '50000000000000000000000',
  totalDistributedEns: '50000.000000000000000000',
  activeVoterCount: 100,
  eligibleTokenHolderCount: 1000,
  lotteryBucketCount: 1,
  lotteryEntryCount: 2,
  lotteryParticipantCount: 2,
  lotteryWinnerCount: 1,
  lotteryPrize: '10000000000000000000',
  lotteryPrizeEns: '10.000000000000000000',
  computedAt: '2026-05-01T00:00:00.000Z',
  addressReward: null,
  topVoterRewards: [],
  topTokenHolderRewards: [],
  lottery: null,
}

function reward(overrides: Partial<AddressRoundReward>): AddressRoundReward {
  return {
    address: WALLET,
    rewardStatus: 'paid',
    voterReward: '0',
    voterRewardEns: '0.000000000000000000',
    tokenHolderReward: '0',
    tokenHolderRewardEns: '0.000000000000000000',
    lotteryReward: '0',
    lotteryRewardEns: '0.000000000000000000',
    totalReward: '0',
    totalRewardEns: '0.000000000000000000',
    ...overrides,
  }
}

// WALLET holds a losing entry in pool #1; WINNER takes the prize.
const lotteryWithLostEntry: LotteryDetail = {
  seed: {
    source: 'ethereum_prev_randao',
    label: 'Ethereum prevRandao',
    value: '0xabc0000000000000000000000000000000000000000000000000000000000000',
    blockNumber: '24996367',
    algorithm: 'keccak256(prevRandao, bucketIndex)',
  },
  bucketTarget: '10000000000000000000',
  bucketTargetEns: '10.000000000000000000',
  totalPrize: '10000000000000000000',
  totalPrizeEns: '10.000000000000000000',
  bucketCount: 1,
  entryCount: 2,
  participantCount: 2,
  winnerCount: 1,
  buckets: [
    {
      bucketIndex: 0,
      prize: '10000000000000000000',
      prizeEns: '10.000000000000000000',
      winner: WINNER,
      winnerEnsName: 'winner.eth',
      winnerProbability: '0.0510',
      entryCount: 2,
      entries: [
        {
          bucketIndex: 0,
          entryIndex: 1,
          address: WINNER,
          ensName: 'winner.eth',
          amount: '510000000000000000',
          amountEns: '0.510000000000000000',
          probability: '0.0510',
        },
        {
          bucketIndex: 0,
          entryIndex: 2,
          address: WALLET,
          ensName: null,
          amount: '620000000000000000',
          amountEns: '0.620000000000000000',
          probability: '0.0620',
        },
      ],
    },
  ],
}

function noop() {}

interface RenderOverrides {
  round?: Partial<RoundDetailResponse>
  activeAddress?: string
  addressInput?: string
  error?: string | null
  connectedAddress?: string
  onInputChange?: (value: string) => void
  onSubmit?: (addressOverride?: string) => void
  onClear?: () => void
}

function renderSection({
  round: roundOverrides,
  activeAddress = '',
  addressInput = '',
  error = null,
  connectedAddress,
  onInputChange = noop,
  onSubmit = noop,
  onClear = noop,
}: RenderOverrides = {}) {
  return renderApp(
    <CheckWalletSection
      round={{ ...baseRound, ...roundOverrides }}
      activeAddress={activeAddress}
      addressInput={addressInput}
      error={error}
      connectedAddress={connectedAddress}
      onInputChange={onInputChange}
      onSubmit={onSubmit}
      onClear={onClear}
    />,
  )
}

describe('deriveCheckWalletView', () => {
  it('is empty without an inspected address', () => {
    expect(deriveCheckWalletView(baseRound, '')).toEqual({ kind: 'empty' })
  })

  it('is pending while the round has no distribution data', () => {
    const view = deriveCheckWalletView(
      { ...baseRound, distributionDataStatus: 'in_progress' },
      WALLET,
    )
    expect(view).toEqual({ kind: 'pending' })
  })

  it('builds only the role rows that actually paid', () => {
    const view = deriveCheckWalletView(
      {
        ...baseRound,
        addressReward: reward({
          voterRewardEns: '25.000000000000000000',
          totalRewardEns: '25.000000000000000000',
        }),
      },
      WALLET,
    )
    expect(view.kind).toBe('earned')
    if (view.kind !== 'earned') return
    expect(view.rows.map((row) => row.label)).toEqual(['As delegate (voting)'])
    expect(view.totalEns).toBe('25.000000000000000000')
  })

  it('flags a losing lottery entry as its own state', () => {
    const view = deriveCheckWalletView(
      { ...baseRound, lottery: lotteryWithLostEntry },
      WALLET,
    )
    expect(view).toEqual({
      kind: 'lottery-lost',
      entry: {
        oddsPct: '6.2',
        entryAmountEns: '0.620000000000000000',
      },
    })
  })

  it('does not mark the pool winner as lottery-lost', () => {
    const view = deriveCheckWalletView(
      { ...baseRound, lottery: lotteryWithLostEntry },
      WINNER,
    )
    expect(view).toEqual({ kind: 'no-reward' })
  })

  it('falls back to no-reward when the wallet is absent everywhere', () => {
    const view = deriveCheckWalletView(
      { ...baseRound, lottery: lotteryWithLostEntry },
      OTHER_WALLET,
    )
    expect(view).toEqual({ kind: 'no-reward' })
  })
})

describe('findLostLotteryEntry', () => {
  it('computes odds from the bucket when the API has no probability', () => {
    const lottery: LotteryDetail = {
      ...lotteryWithLostEntry,
      buckets: [
        {
          ...lotteryWithLostEntry.buckets[0],
          entries: [
            {
              ...lotteryWithLostEntry.buckets[0].entries[0],
              amountEns: '1.500000000000000000',
              probability: '',
            },
            {
              ...lotteryWithLostEntry.buckets[0].entries[1],
              amountEns: '0.500000000000000000',
              probability: '',
            },
          ],
        },
      ],
    }

    // 0.5 of a 2.0 ENS bucket → 25.0% odds.
    expect(findLostLotteryEntry(lottery, WALLET)?.oddsPct).toBe('25.0')
  })

  it('is case-insensitive on addresses', () => {
    expect(
      findLostLotteryEntry(lotteryWithLostEntry, WALLET.toUpperCase()),
    ).not.toBeNull()
  })
})

describe('CheckWalletSection', () => {
  it('renders the empty state for disconnected visitors', () => {
    renderSection()

    expect(
      screen.getByText('See what this round paid an address'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Search an address or ENS name above to see what it earned this round',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /Use my connected wallet/i }),
    ).toBeInTheDocument()
    // Right panel keeps the desktop footprint; CSS hides it on mobile.
    const explainer = screen.getByTestId('check-wallet-explainer')
    expect(within(explainer).getByText('Two ways a wallet earns')).toBeInTheDocument()
    expect(
      within(explainer).getByText('As a delegate, for voting on proposals'),
    ).toBeInTheDocument()
    expect(
      within(explainer).getByText(
        'As a token holder, for delegating to an active voter',
      ),
    ).toBeInTheDocument()
    expect(
      within(explainer).getByText('Search a wallet to see its split.'),
    ).toBeInTheDocument()
  })

  it('submits the connected wallet from the empty-state action', async () => {
    const onSubmit = vi.fn()
    renderSection({ connectedAddress: WALLET, onSubmit })

    await userEvent.click(
      screen.getByRole('button', { name: /Use my connected wallet/i }),
    )

    expect(onSubmit).toHaveBeenCalledWith(WALLET)
  })

  it('shows conditional role rows and the total for a dual-role wallet', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: reward({
          voterRewardEns: '25.000000000000000000',
          tokenHolderRewardEns: '10.000000000000000000',
          totalRewardEns: '35.000000000000000000',
        }),
      },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    expect(within(breakdown).getByText('This wallet reward')).toBeInTheDocument()
    expect(
      within(breakdown).getByTestId('check-wallet-reward-value'),
    ).toHaveTextContent('35.00 ENS')
    expect(within(breakdown).getByText('Reward breakdown')).toBeInTheDocument()
    expect(within(breakdown).getByText('As delegate (voting)')).toBeInTheDocument()
    expect(within(breakdown).getByText('25.00 ENS')).toBeInTheDocument()
    expect(within(breakdown).getByText('As token holder')).toBeInTheDocument()
    expect(within(breakdown).getByText('10.00 ENS')).toBeInTheDocument()
    expect(within(breakdown).getByText('Total earned')).toBeInTheDocument()
    expect(
      within(breakdown).getByTestId('check-wallet-total-value'),
    ).toHaveTextContent('35.00 ENS')
  })

  it('keeps a single role row for a single-role wallet', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: reward({
          tokenHolderRewardEns: '12.000000000000000000',
          totalRewardEns: '12.000000000000000000',
        }),
      },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    expect(within(breakdown).getByText('As token holder')).toBeInTheDocument()
    expect(
      within(breakdown).queryByText('As delegate (voting)'),
    ).not.toBeInTheDocument()
    expect(within(breakdown).getByText('Total earned')).toBeInTheDocument()
  })

  it('does not render a Direct/Lottery payout chip on earned cards', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: reward({
          voterRewardEns: '25.000000000000000000',
          totalRewardEns: '25.000000000000000000',
        }),
      },
    })

    expect(screen.queryByText(/^Direct$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Lottery$/)).not.toBeInTheDocument()
  })

  it('adds a lottery prize row when the wallet won a pool', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: reward({
          lotteryRewardEns: '10.000000000000000000',
          totalRewardEns: '10.000000000000000000',
        }),
      },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    expect(within(breakdown).getByText('Lottery prize')).toBeInTheDocument()
  })

  it('renders the lottery-lost state with odds and entry breakdown', () => {
    renderSection({
      activeAddress: WALLET,
      round: { lottery: lotteryWithLostEntry },
    })

    expect(
      screen.getByText(
        "Entered the lottery with 6.2% odds, didn't win this round.",
      ),
    ).toBeInTheDocument()

    const entryCard = screen.getByTestId('check-wallet-lottery-entry')
    expect(
      within(entryCard).getByTestId('check-wallet-reward-value'),
    ).toHaveTextContent('0 ENS')
    expect(within(entryCard).getByText('Your lottery entry')).toBeInTheDocument()
    expect(within(entryCard).getByText('As token holder')).toBeInTheDocument()
    expect(within(entryCard).getByText('Entry total')).toBeInTheDocument()
    // Entry row and entry total both show the same losing entry amount.
    expect(within(entryCard).getAllByText('0.62 ENS')).toHaveLength(2)
  })

  it('renders the no-reward state in the result panel', () => {
    renderSection({ activeAddress: WALLET })

    const panel = screen.getByTestId('check-wallet-no-reward')
    expect(
      within(panel).getByTestId('check-wallet-reward-value'),
    ).toHaveTextContent('0 ENS')
    expect(within(panel).getByText('No reward this round')).toBeInTheDocument()
    expect(screen.queryByTestId('check-wallet-explainer')).not.toBeInTheDocument()
    expect(screen.queryByTestId('check-wallet-breakdown')).not.toBeInTheDocument()
  })

  it('renders the pending state while the round is still running', () => {
    renderSection({
      activeAddress: WALLET,
      round: { distributionDataStatus: 'in_progress', status: 'live' },
    })

    expect(screen.getByText('This round hasn’t finished yet.')).toBeInTheDocument()
    expect(
      screen.getByText(/Round 2 is still live\. Results show up the moment it closes\./),
    ).toBeInTheDocument()
  })

  it('marks the inspected wallet as yours when it matches the connected one', () => {
    renderSection({
      activeAddress: WALLET,
      connectedAddress: WALLET,
      round: { addressReward: reward({ totalRewardEns: '0' }) },
    })

    const identity = screen.getByTestId('check-wallet-identity')
    expect(within(identity).getByText('Inspecting your wallet')).toBeInTheDocument()
    expect(within(identity).getByText('0xd8da…6045')).toBeInTheDocument()
  })

  it('does not claim a foreign wallet as yours', () => {
    renderSection({
      activeAddress: WALLET,
      connectedAddress: OTHER_WALLET,
      round: { addressReward: reward({ totalRewardEns: '0' }) },
    })

    const identity = screen.getByTestId('check-wallet-identity')
    expect(
      within(identity).queryByText('Inspecting your wallet'),
    ).not.toBeInTheDocument()
  })

  it('clears the lookup via the Clear button', async () => {
    const onClear = vi.fn()
    renderSection({ activeAddress: WALLET, addressInput: WALLET, onClear })

    await userEvent.click(screen.getByRole('button', { name: /Clear/i }))

    expect(onClear).toHaveBeenCalled()
  })

  it('searches on Enter from the input', async () => {
    const onSubmit = vi.fn()
    renderSection({ onSubmit })

    const input = screen.getByLabelText('Search by ENS name or address')
    await userEvent.type(input, 'name.eth{Enter}')

    expect(onSubmit).toHaveBeenCalled()
  })
})
