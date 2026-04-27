import type {
  HealthResponse,
  StatusResponse,
  ActiveDelegatesResponse,
  EligibilityResponse,
  TierProgressionResponse,
  ApyEstimateResponse,
  DistributionResponse,
  RoundInfoResponse,
} from './types'

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const MOCK_TIERS: TierProgressionResponse = {
  currentAVP: '1250000000000000000000000',
  previousAVP: '1112000000000000000000000',
  currentGrowthBps: '1240',
  currentGrowthPct: '12.40',
  currentTierIndex: 1,
  activeDelegateCount: 47,
  maxDelegatorApyPct: '120.00',
  tiers: [
    {
      index: 0,
      momGrowthMinPct: '0',
      momGrowthMaxPct: '10',
      poolSizeEns: '5000',
      delegateCapEns: '50',
      delegatorCapEns: '250',
      isCurrent: false,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredAVP: '1112000000000000000000000',
      estimatedApyPct: '4.80',
    },
    {
      index: 1,
      momGrowthMinPct: '10',
      momGrowthMaxPct: '20',
      poolSizeEns: '8000',
      delegateCapEns: '80',
      delegatorCapEns: '400',
      isCurrent: true,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredAVP: '1223200000000000000000000',
      estimatedApyPct: '8.64',
    },
    {
      index: 2,
      momGrowthMinPct: '20',
      momGrowthMaxPct: '30',
      poolSizeEns: '10000',
      delegateCapEns: '100',
      delegatorCapEns: '500',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '84200000000000000000000',
      requiredAVP: '1334400000000000000000000',
      estimatedApyPct: '15.65',
    },
    {
      index: 3,
      momGrowthMinPct: '30',
      momGrowthMaxPct: '50',
      poolSizeEns: '15000',
      delegateCapEns: '150',
      delegatorCapEns: '750',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '195400000000000000000000',
      requiredAVP: '1445600000000000000000000',
      estimatedApyPct: '27.00',
    },
    {
      index: 4,
      momGrowthMinPct: '50',
      momGrowthMaxPct: '75',
      poolSizeEns: '20000',
      delegateCapEns: '200',
      delegatorCapEns: '1000',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '418000000000000000000000',
      requiredAVP: '1668000000000000000000000',
      estimatedApyPct: '46.29',
    },
    {
      index: 5,
      momGrowthMinPct: '75',
      momGrowthMaxPct: '100',
      poolSizeEns: '25000',
      delegateCapEns: '250',
      delegatorCapEns: '1250',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '696000000000000000000000',
      requiredAVP: '1946000000000000000000000',
      estimatedApyPct: '80.00',
    },
    {
      index: 6,
      momGrowthMinPct: '100',
      momGrowthMaxPct: 'Infinity',
      poolSizeEns: '30000',
      delegateCapEns: '300',
      delegatorCapEns: '1500',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '974000000000000000000000',
      requiredAVP: '2224000000000000000000000',
      estimatedApyPct: '120.00',
    },
  ],
}

const MOCK_DELEGATES: ActiveDelegatesResponse = {
  count: 38,
  delegates: [
    {
      address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      ensName: 'nick.eth',
      avatarUrl: null,
      votingPower: '450000000000000000000000',
      votesInLast10: 8,
      delegatorCount: 214,
      activeSince: '2022-03-15T00:00:00Z',
      last10ProposalsVoted: [true, true, true, false, true, true, true, true, false, true],
    },
    {
      address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      ensName: 'avsa.eth',
      avatarUrl: null,
      votingPower: '320000000000000000000000',
      votesInLast10: 9,
      delegatorCount: 98,
      activeSince: '2022-05-20T00:00:00Z',
      last10ProposalsVoted: [true, true, false, true, true, true, true, true, true, true],
    },
    {
      address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      ensName: 'slobo.eth',
      avatarUrl: null,
      votingPower: '210000000000000000000000',
      votesInLast10: 9,
      delegatorCount: 67,
      activeSince: '2022-08-01T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, false, true, true, true, true],
    },
    {
      address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
      ensName: 'alisha.eth',
      avatarUrl: null,
      votingPower: '180000000000000000000000',
      votesInLast10: 9,
      delegatorCount: 53,
      activeSince: '2023-01-10T00:00:00Z',
      last10ProposalsVoted: [true, false, true, true, true, true, true, true, true, true],
    },
    {
      address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      ensName: 'validator.eth',
      avatarUrl: null,
      votingPower: '95000000000000000000000',
      votesInLast10: 8,
      delegatorCount: 31,
      activeSince: '2023-04-22T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, false, true, true, true, true, false],
    },
    {
      address: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
      ensName: null,
      avatarUrl: null,
      votingPower: '72000000000000000000000',
      votesInLast10: 9,
      delegatorCount: 18,
      activeSince: '2023-06-05T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, false, true, true, true],
    },
  ],
}

function createMockRound(): RoundInfoResponse {
  const now = new Date()
  const year = now.getUTCFullYear()
  const month = now.getUTCMonth()
  const startDate = new Date(Date.UTC(year, month, 1)).toISOString()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  const endDate = new Date(Date.UTC(year, month, lastDay, 23, 59, 59, 999)).toISOString()
  const currentDay = now.getUTCDate()

  return {
    roundNumber: 4,
    startDate,
    endDate,
    percentComplete: Math.round((currentDay / lastDay) * 100),
    daysRemaining: lastDay - currentDay,
    poolSizeEns: '8000',
    tierIndex: 1,
    vpGrowthPct: '12.40',
  }
}

const MOCK_DISTRIBUTION: DistributionResponse = {
  month: '2026-02',
  metadata: {
    totalDistributed: '1000000000000000000000',
    totalDistributedEns: '1000',
    poolTier: {
      momGrowthMinBps: '500',
      momGrowthMaxBps: '1000',
      poolSize: '1000000000000000000000',
      delegateCap: '80000000000000000000',
      delegatorCap: '15000000000000000000',
    },
    momGrowthBps: '909',
    activeDelegateCount: 38,
    eligibleDelegatorCount: 214,
    computedAt: '2026-03-01T00:05:00Z',
    randaoSeed: '0xdeadbeef',
  },
  directPayouts: [
    {
      address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      ensName: 'nick.eth',
      amount: '12340000000000000000',
      amountEns: '12.34',
      role: 'delegate',
    },
    {
      address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      ensName: 'avsa.eth',
      amount: '8760000000000000000',
      amountEns: '8.76',
      role: 'delegate',
    },
  ],
  lotteryPools: [
    {
      totalPrize: '10000000000000000000',
      totalPrizeEns: '10',
      winner: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
      winnerEnsName: 'lucky.eth',
      entries: [
        {
          address: '0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b',
          ensName: 'lucky.eth',
          originalAmount: '500000000000000000',
          role: 'delegator',
        },
      ],
    },
  ],
}

export const mockApi = {
  health: () => delay<HealthResponse>({ status: 'ok' }),

  status: () =>
    delay<StatusResponse>({
      activeDelegateCount: 38,
      proposalCount: 52,
      cachedDistributions: ['2026-02', '2026-01', '2025-12'],
      totalDelegatedEns: '1250000.000000000000000000',
      holdersEarning: 412,
    }),

  activeDelegates: () => delay(MOCK_DELEGATES),

  eligibility: (_address: string) =>
    delay<EligibilityResponse>({
      address: _address,
      ensName: null,
      isActiveDelegate: false,
      isDelegatorToActiveDelegate: false,
      eligible: false,
      delegatedTo: null,
      delegatedToEnsName: null,
      source: null,
    }),

  tierProgression: () => delay(MOCK_TIERS),

  apy: (_address: string) =>
    delay<ApyEstimateResponse>({
      address: _address,
      ensName: null,
      avatarUrl: null,
      role: 'ineligible',
      delegatedTo: null,
      delegatedToEnsName: null,
      delegatedToAvatarUrl: null,
      poolSizeEns: '1000',
      estimatedMonthlyRewardEns: '0',
      estimatedApyPct: '0',
      userShareWei: '0',
      totalShareWei: '0',
      currentBalanceEns: '0',
      qualifiesForLottery: false,
    }),

  distributionList: () => delay<string[]>(['2026-02', '2026-01', '2025-12']),

  distribution: (_month: string) => delay(MOCK_DISTRIBUTION),

  currentRound: () => delay(createMockRound()),
} as const
