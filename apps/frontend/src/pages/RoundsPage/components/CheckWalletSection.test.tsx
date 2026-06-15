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

/* ─── Provenance layer (DEV-764) ─── */

function voterProvenance(overrides: Record<string, unknown> = {}) {
  return {
    avgVotingPower: '812000000000000000000000',
    avgVotingPowerEns: '812000.00',
    poolSharePct: '0.82',
    rawReward: '2340000000000000000',
    rawRewardEns: '2.34',
    finalReward: '2100000000000000000',
    finalRewardEns: '2.10',
    cap: '2300000000000000000',
    capEns: '2.30',
    capStatus: 'reached_cap',
    redistributionReceived: '200000000000000000',
    redistributionReceivedEns: '0.20',
    ...overrides,
  }
}

function tokenHolderProvenance(overrides: Record<string, unknown> = {}) {
  return {
    avgBalance: '2140000000000000000000',
    avgBalanceEns: '2140.00',
    poolSharePct: '2.10',
    rawReward: '10300000000000000000',
    rawRewardEns: '10.30',
    finalReward: '10300000000000000000',
    finalRewardEns: '10.30',
    cap: '250000000000000000000',
    capEns: '250.00',
    capStatus: 'not_affected',
    redistributionReceived: '0',
    redistributionReceivedEns: '0.00',
    sources: ['direct', 'multidelegate', 'hedgey'],
    ...overrides,
  }
}

/** Both roles paid; voter reached the cap, holder untouched. 2.10 + 10.30. */
function dualRoleReward(provenance: unknown): AddressRoundReward {
  return {
    ...reward({
      voterReward: '2100000000000000000',
      voterRewardEns: '2.100000000000000000',
      tokenHolderReward: '10300000000000000000',
      tokenHolderRewardEns: '10.300000000000000000',
      totalReward: '12400000000000000000',
      totalRewardEns: '12.400000000000000000',
    }),
    provenance,
  } as AddressRoundReward
}

const fullProvenance = {
  voter: voterProvenance(),
  tokenHolder: tokenHolderProvenance(),
}

// WALLET wins pool #0 with a 0.62 ENS entry.
const lotteryWithWonPool: LotteryDetail = {
  ...lotteryWithLostEntry,
  buckets: [
    {
      ...lotteryWithLostEntry.buckets[0],
      winner: WALLET,
      winnerEnsName: null,
      winnerProbability: '0.0620',
    },
  ],
}

async function openMath() {
  await userEvent.click(screen.getByTestId('check-wallet-show-math'))
  return screen.getByTestId('check-wallet-math')
}

describe('CheckWalletSection · provenance (DEV-764)', () => {
  it('shows the per-role share percentages computed from wei', () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    // 2.10 / 12.40 → 17%; 10.30 / 12.40 → 83%.
    expect(within(breakdown).getByText('17%')).toBeInTheDocument()
    expect(within(breakdown).getByText('83%')).toBeInTheDocument()
  })

  it('expands the math with both role sections and distinct averaging windows', async () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    expect(screen.queryByTestId('check-wallet-math')).not.toBeInTheDocument()
    const math = await openMath()

    expect(
      within(math).getByText('The math behind your 12.40 ENS'),
    ).toBeInTheDocument()

    // Delegate portion — TWAP over the round month.
    expect(within(math).getByText('Average voting power held')).toBeInTheDocument()
    expect(within(math).getByText('over the round month')).toBeInTheDocument()
    expect(within(math).getByText('812K ENS')).toBeInTheDocument()
    expect(within(math).getByText('0.82%')).toBeInTheDocument()

    // Holder portion — TWB over the trailing 180 days. The two windows must
    // not read as the same number.
    expect(within(math).getByText('Average token balance')).toBeInTheDocument()
    expect(within(math).getByText('over the last 180 days')).toBeInTheDocument()
    expect(within(math).getByText('2,140 ENS')).toBeInTheDocument()

    // Round inputs come from the existing round fields.
    const inputs = within(math).getByTestId('check-wallet-round-inputs')
    expect(within(inputs).getByText('Tier 1')).toBeInTheDocument()
    expect(within(inputs).getByText('50,000 ENS')).toBeInTheDocument()
    expect(within(inputs).getByText('+1.25%')).toBeInTheDocument()
  })

  it('collapses the math again from the same toggle', async () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    await openMath()
    await userEvent.click(
      screen.getByRole('button', { name: /Hide the math/i }),
    )

    expect(screen.queryByTestId('check-wallet-math')).not.toBeInTheDocument()
  })

  it('renders the reached-cap ledger with the reconstructed trail', async () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    const math = await openMath()
    const ledger = within(math).getByTestId('check-wallet-cap-ledger-delegate')

    expect(
      within(ledger).getByText('Cap redistribution · delegate · cap 1% (2.30 ENS)'),
    ).toBeInTheDocument()
    expect(within(ledger).getByText('Raw proportional share')).toBeInTheDocument()
    expect(within(ledger).getByText('under cap')).toBeInTheDocument()
    expect(within(ledger).getByText('+0.20')).toBeInTheDocument()
    expect(within(ledger).getByText('reached cap')).toBeInTheDocument()
    expect(within(ledger).getByText('-0.44')).toBeInTheDocument()
    expect(within(ledger).getByText('Final (clamped)')).toBeInTheDocument()
    expect(
      within(ledger).getByText('-0.44 ENS shed to other wallets after reaching the cap.'),
    ).toBeInTheDocument()

    // The untouched holder still gets its green cap check.
    const holderLedger = within(math).getByTestId('check-wallet-cap-ledger-holder')
    expect(within(holderLedger).getByText('Cap check · token holder')).toBeInTheDocument()
    expect(
      within(holderLedger).getByText(
        'Paid your full proportional share. No cap applied this round.',
      ),
    ).toBeInTheDocument()
  })

  it('renders the received-redistribution ledger with the green footnote', async () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: dualRoleReward({
          voter: null,
          tokenHolder: tokenHolderProvenance({
            rawReward: '3400000000000000000',
            rawRewardEns: '3.40',
            finalReward: '5300000000000000000',
            finalRewardEns: '5.30',
            capStatus: 'received_redistribution',
            redistributionReceived: '1900000000000000000',
            redistributionReceivedEns: '1.90',
          }),
        }),
      },
    })

    const math = await openMath()
    const ledger = within(math).getByTestId('check-wallet-cap-ledger-holder')

    expect(
      within(ledger).getByText('Cap redistribution · token holder · cap 5% (250.00 ENS)'),
    ).toBeInTheDocument()
    expect(within(ledger).getByText('+1.90')).toBeInTheDocument()
    expect(
      within(ledger).getByText('+1.90 ENS received from wallets that hit their cap.'),
    ).toBeInTheDocument()
    // No delegate ledger when the wallet earned no delegate reward.
    expect(
      within(math).queryByTestId('check-wallet-cap-ledger-delegate'),
    ).not.toBeInTheDocument()
    expect(within(math).queryByTestId('check-wallet-math-voter')).not.toBeInTheDocument()
  })

  it('lists generic delegation sources and hides them when null', async () => {
    const { unmount } = renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    let math = await openMath()
    const sources = within(math).getByTestId('check-wallet-math-sources')
    expect(
      within(sources).getByText('Where your delegated balance came from'),
    ).toBeInTheDocument()
    expect(
      within(sources).getByText('Delegated directly from this wallet'),
    ).toBeInTheDocument()
    expect(
      within(sources).getByText('Via the ERC20MultiDelegate contract'),
    ).toBeInTheDocument()
    expect(within(sources).getByText('Via a Hedgey vesting plan')).toBeInTheDocument()

    unmount()

    // `sources: null` → only the sources list disappears.
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: dualRoleReward({
          voter: voterProvenance(),
          tokenHolder: tokenHolderProvenance({ sources: null }),
        }),
      },
    })

    math = await openMath()
    expect(within(math).getByTestId('check-wallet-math-holder')).toBeInTheDocument()
    expect(
      within(math).queryByTestId('check-wallet-math-sources'),
    ).not.toBeInTheDocument()
  })

  it('renders the reconciliation line from the wei strings', async () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    const math = await openMath()
    const reconciliation = within(math).getByTestId('check-wallet-math-reconciliation')

    expect(reconciliation).toHaveTextContent('2.10 + 10.30 = 12.40 ENS')
    expect(
      within(reconciliation).queryByTestId('check-wallet-math-mismatch'),
    ).not.toBeInTheDocument()
  })

  it('flags a reconciliation mismatch against the recorded total', async () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: {
          ...dualRoleReward(fullProvenance),
          totalReward: '13000000000000000000',
          totalRewardEns: '13.000000000000000000',
        },
      },
    })

    const math = await openMath()

    expect(
      within(math).getByTestId('check-wallet-math-mismatch'),
    ).toHaveTextContent("Doesn't add up to the recorded total of 13.00 ENS.")
  })

  it('degrades gracefully when provenance is null', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: reward({
          voterReward: '25000000000000000000',
          voterRewardEns: '25.000000000000000000',
          totalReward: '25000000000000000000',
          totalRewardEns: '25.000000000000000000',
        }),
      },
    })

    // Summary still renders from the current fields…
    expect(
      screen.getByTestId('check-wallet-reward-value'),
    ).toHaveTextContent('25.00 ENS')
    // …but the math affordance is replaced by the muted note.
    expect(screen.queryByTestId('check-wallet-show-math')).not.toBeInTheDocument()
    expect(
      screen.getByTestId('check-wallet-math-unavailable'),
    ).toHaveTextContent('Math not available for this round.')
  })

  it('shows no single-role note when both roles paid', () => {
    renderSection({
      activeAddress: WALLET,
      round: { addressReward: dualRoleReward(fullProvenance) },
    })

    expect(screen.queryByText(/You earned only by voting/)).not.toBeInTheDocument()
    expect(screen.queryByText(/You earned only as a token holder/)).not.toBeInTheDocument()
  })

  it('notes a delegate-only wallet and the direct transfer', () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: {
          ...reward({
            voterReward: '2100000000000000000',
            voterRewardEns: '2.100000000000000000',
            totalReward: '2100000000000000000',
            totalRewardEns: '2.100000000000000000',
          }),
          provenance: { voter: voterProvenance(), tokenHolder: null },
        } as AddressRoundReward,
      },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    expect(
      within(breakdown).getByText(
        'You earned only by voting this round. No tokens were delegated to you.',
      ),
    ).toBeInTheDocument()
    expect(
      within(breakdown).getByText('Paid directly in one transfer (1 ENS or more).'),
    ).toBeInTheDocument()
    expect(within(breakdown).getByText('100%')).toBeInTheDocument()
  })

  it('details a lottery win with odds and the pool narrative', async () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: {
          ...reward({
            lotteryReward: '10000000000000000000',
            lotteryRewardEns: '10.000000000000000000',
            totalReward: '10000000000000000000',
            totalRewardEns: '10.000000000000000000',
          }),
          provenance: { voter: null, tokenHolder: null },
        } as AddressRoundReward,
        lottery: lotteryWithWonPool,
      },
    })

    const breakdown = screen.getByTestId('check-wallet-breakdown')
    expect(
      within(breakdown).getByTestId('check-wallet-lottery-win'),
    ).toHaveTextContent('Lottery win · 10.00 ENS · 6.2% odds')
    expect(
      within(breakdown).getByText(
        /Your reward was under 1 ENS, so it entered a shared pool of about 10 ENS\./,
      ),
    ).toBeInTheDocument()

    // The math panel carries the draw detail from the lottery payload.
    const math = await openMath()
    const draw = within(math).getByTestId('check-wallet-math-lottery')
    expect(within(draw).getByText('Lottery draw')).toBeInTheDocument()
    expect(within(math).getByText('Entry that qualified')).toBeInTheDocument()
    expect(within(math).getByText('0.62 ENS')).toBeInTheDocument()
    expect(within(math).getByText('6.2%')).toBeInTheDocument()
    expect(within(math).getByText('#24,996,367')).toBeInTheDocument()
    expect(within(math).getByText('Ethereum prevRandao')).toBeInTheDocument()
  })

  it('offers the math on a lost lottery entry when provenance exists', async () => {
    renderSection({
      activeAddress: WALLET,
      round: {
        addressReward: {
          ...reward({}),
          provenance: { voter: null, tokenHolder: null },
        } as AddressRoundReward,
        lottery: lotteryWithLostEntry,
      },
    })

    const entryCard = screen.getByTestId('check-wallet-lottery-entry')
    expect(
      within(entryCard).getByText(
        /Rewards under 1 ENS go into a pool draw instead of a direct payout\./,
      ),
    ).toBeInTheDocument()

    const math = await openMath()
    expect(within(math).getByTestId('check-wallet-math-lottery')).toBeInTheDocument()
    expect(within(math).getByText('6.2%')).toBeInTheDocument()
    expect(within(math).getByTestId('check-wallet-round-inputs')).toBeInTheDocument()
  })

  it('upgrades the no-reward state with the small-state card', () => {
    renderSection({ activeAddress: WALLET })

    const panel = screen.getByTestId('check-wallet-no-reward')
    expect(within(panel).getByText('No reward this round')).toBeInTheDocument()
    expect(
      within(panel).getByText("This wallet didn't earn anything in this round."),
    ).toBeInTheDocument()
    // No math affordance when there is nothing to explain.
    expect(screen.queryByTestId('check-wallet-show-math')).not.toBeInTheDocument()
    expect(
      screen.queryByTestId('check-wallet-math-unavailable'),
    ).not.toBeInTheDocument()
  })
})
