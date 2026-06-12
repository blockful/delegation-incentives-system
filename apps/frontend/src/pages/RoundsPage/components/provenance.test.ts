import type { AddressRoundReward } from '@/api/types'
import {
  buildCapLedger,
  formatWeiToEns,
  integerSharePct,
  readProvenance,
  reconcileProvenance,
  sourceLabel,
  type AddressRewardProvenance,
  type TokenHolderProvenance,
  type VoterProvenance,
} from './provenance'

const WALLET = '0xd8da6bf26964af9d7eed9e03e53415d37aa96045'

function reward(overrides: Partial<AddressRoundReward> = {}): AddressRoundReward {
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

/** Attach a DEV-764 `provenance` block — the field is not in the generated
 *  schema types yet, hence the cast (mirrors what the API will return). */
function rewardWithProvenance(
  overrides: Partial<AddressRoundReward>,
  provenance: unknown,
): AddressRoundReward {
  return { ...reward(overrides), provenance } as AddressRoundReward
}

function voterFixture(
  overrides: Partial<VoterProvenance> = {},
): VoterProvenance {
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

function tokenHolderFixture(
  overrides: Partial<TokenHolderProvenance> = {},
): TokenHolderProvenance {
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

describe('readProvenance', () => {
  it('is null without a reward object', () => {
    expect(readProvenance(null)).toBeNull()
  })

  it('is null when the reward has no provenance block', () => {
    expect(readProvenance(reward())).toBeNull()
  })

  it('reads a full provenance block with both roles', () => {
    const provenance = readProvenance(
      rewardWithProvenance({}, { voter: voterFixture(), tokenHolder: tokenHolderFixture() }),
    )

    expect(provenance?.voter?.avgVotingPowerEns).toBe('812000.00')
    expect(provenance?.tokenHolder?.sources).toEqual([
      'direct',
      'multidelegate',
      'hedgey',
    ])
  })

  it('keeps null roles null (single-role wallets)', () => {
    const provenance = readProvenance(
      rewardWithProvenance({}, { voter: voterFixture(), tokenHolder: null }),
    )

    expect(provenance?.voter).not.toBeNull()
    expect(provenance?.tokenHolder).toBeNull()
  })

  it('coerces a missing sources array to null without dropping the role', () => {
    const provenance = readProvenance(
      rewardWithProvenance(
        {},
        { voter: null, tokenHolder: { ...tokenHolderFixture(), sources: null } },
      ),
    )

    expect(provenance?.tokenHolder).not.toBeNull()
    expect(provenance?.tokenHolder?.sources).toBeNull()
  })

  it('degrades a malformed role to "math not available" instead of misreporting it', () => {
    const provenance = readProvenance(
      rewardWithProvenance(
        {},
        { voter: { capStatus: 'banana' }, tokenHolder: tokenHolderFixture() },
      ),
    )

    expect(provenance).toBeNull()
  })
})

describe('formatWeiToEns', () => {
  it('rounds wei half-up to two decimals with separators', () => {
    expect(formatWeiToEns(12400000000000000000n)).toBe('12.40')
    expect(formatWeiToEns(1234555000000000000000n)).toBe('1,234.56')
    expect(formatWeiToEns(0n)).toBe('0.00')
  })

  it('keeps the sign on negative amounts', () => {
    expect(formatWeiToEns(-440000000000000000n)).toBe('-0.44')
  })
})

describe('integerSharePct', () => {
  it('computes the rounded share of the total from wei strings', () => {
    // 2.10 of 12.40 → 16.9% → 17; 10.30 of 12.40 → 83.06% → 83.
    expect(integerSharePct('2100000000000000000', '12400000000000000000')).toBe('17')
    expect(integerSharePct('10300000000000000000', '12400000000000000000')).toBe('83')
  })

  it('is null for zero totals and unparseable input', () => {
    expect(integerSharePct('1', '0')).toBeNull()
    expect(integerSharePct('not-wei', '100')).toBeNull()
    expect(integerSharePct(null, '100')).toBeNull()
  })
})

describe('buildCapLedger', () => {
  it('maps not_affected to the green cap-check variant', () => {
    expect(buildCapLedger('token holder', tokenHolderFixture())).toEqual({
      variant: 'not-affected',
      role: 'token holder',
    })
  })

  it('reconstructs the reached-cap trail: raw → redistribution → clamp', () => {
    const ledger = buildCapLedger('delegate', voterFixture())

    expect(ledger).toMatchObject({
      variant: 'capped',
      role: 'delegate',
      capPct: '1',
      capEns: '2.30',
      rawEns: '2.34',
      finalLabel: 'Final (clamped)',
      finalEns: '2.10',
    })
    if (ledger?.variant !== 'capped') return
    expect(ledger.steps).toEqual([
      {
        label: 'Redistribution received',
        tag: { text: 'under cap', tone: 'success' },
        deltaEns: '+0.20',
        runningEns: '2.54',
      },
      {
        label: 'Cap applied',
        tag: { text: 'reached cap', tone: 'danger' },
        deltaEns: '-0.44',
        runningEns: '2.10',
      },
    ])
    expect(ledger.footnote).toEqual({
      text: '-0.44 ENS shed to other wallets after reaching the cap.',
      tone: 'danger',
    })
  })

  it('builds the received-redistribution variant with the green footnote', () => {
    const ledger = buildCapLedger(
      'token holder',
      tokenHolderFixture({
        rawReward: '3400000000000000000',
        rawRewardEns: '3.40',
        finalReward: '5300000000000000000',
        finalRewardEns: '5.30',
        capStatus: 'received_redistribution',
        redistributionReceived: '1900000000000000000',
        redistributionReceivedEns: '1.90',
      }),
    )

    expect(ledger).toMatchObject({
      variant: 'redistributed',
      capPct: '5',
      rawEns: '3.40',
      finalLabel: 'Final',
      finalEns: '5.30',
    })
    if (ledger?.variant !== 'redistributed') return
    expect(ledger.steps).toEqual([
      {
        label: 'Redistribution received',
        tag: { text: 'under cap', tone: 'success' },
        deltaEns: '+1.90',
        runningEns: '5.30',
      },
    ])
    expect(ledger.footnote).toEqual({
      text: '+1.90 ENS received from wallets that hit their cap.',
      tone: 'success',
    })
  })
})

describe('reconcileProvenance', () => {
  const bothRoles: AddressRewardProvenance = {
    voter: voterFixture(),
    tokenHolder: tokenHolderFixture(),
  }

  it('sums role finals + lottery with BigInt and confirms the total', () => {
    const view = reconcileProvenance(
      reward({ totalReward: '12400000000000000000', totalRewardEns: '12.40' }),
      bothRoles,
    )

    expect(view).toEqual({
      termsEns: ['2.10', '10.30'],
      sumEns: '12.40',
      matches: true,
      totalEns: '12.40',
    })
  })

  it('includes the lottery term and flags a mismatching total', () => {
    const view = reconcileProvenance(
      reward({
        lotteryReward: '10000000000000000000',
        totalReward: '23000000000000000000',
        totalRewardEns: '23.00',
      }),
      bothRoles,
    )

    expect(view?.termsEns).toEqual(['2.10', '10.30', '10.00'])
    expect(view?.sumEns).toBe('22.40')
    expect(view?.matches).toBe(false)
    expect(view?.totalEns).toBe('23.00')
  })

  it('is null when there is nothing to reconcile', () => {
    expect(
      reconcileProvenance(reward(), { voter: null, tokenHolder: null }),
    ).toBeNull()
  })
})

describe('sourceLabel', () => {
  it('maps the known delegation kinds to generic copy', () => {
    expect(sourceLabel('direct')).toBe('Delegated directly from this wallet')
    expect(sourceLabel('multidelegate')).toBe('Via the ERC20MultiDelegate contract')
    expect(sourceLabel('hedgey')).toBe('Via a Hedgey vesting plan')
  })

  it('falls back to the raw kind for unknown sources', () => {
    expect(sourceLabel('safe-module')).toBe('Via safe-module')
  })
})
