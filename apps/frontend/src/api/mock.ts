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
  currentAVP: '1200000000000000000000000',
  previousAVP: '1100000000000000000000000',
  currentGrowthBps: '909',
  currentGrowthPct: '9.09',
  currentTierIndex: 1,
  activeDelegateCount: 38,
  maxDelegatorApyPct: '5.75',
  tiers: [
    {
      index: 0,
      momGrowthMinPct: '0',
      momGrowthMaxPct: '5',
      poolSizeEns: '500',
      delegateCapEns: '50',
      delegatorCapEns: '10',
      isCurrent: false,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredAVP: '0',
      estimatedApyPct: '3.20',
    },
    {
      index: 1,
      momGrowthMinPct: '5',
      momGrowthMaxPct: '10',
      poolSizeEns: '1000',
      delegateCapEns: '80',
      delegatorCapEns: '15',
      isCurrent: true,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredAVP: '1000000000000000000000000',
      estimatedApyPct: '5.75',
    },
    {
      index: 2,
      momGrowthMinPct: '10',
      momGrowthMaxPct: '20',
      poolSizeEns: '2000',
      delegateCapEns: '120',
      delegatorCapEns: '20',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '500000000000000000000000',
      requiredAVP: '1500000000000000000000000',
      estimatedApyPct: '8.40',
    },
    {
      index: 3,
      momGrowthMinPct: '20',
      momGrowthMaxPct: '40',
      poolSizeEns: '4000',
      delegateCapEns: '200',
      delegatorCapEns: '30',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '1200000000000000000000000',
      requiredAVP: '2500000000000000000000000',
      estimatedApyPct: '12.00',
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
      delegatorCount: 214,
      activeSince: '2022-03-15T00:00:00Z',
      last10ProposalsVoted: [true, true, true, false, true, true, true, true, false, true],
    },
    {
      address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      ensName: 'avsa.eth',
      avatarUrl: null,
      votingPower: '320000000000000000000000',
      delegatorCount: 98,
      activeSince: '2022-05-20T00:00:00Z',
      last10ProposalsVoted: [true, true, false, true, true, true, true, true, true, true],
    },
    {
      address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      ensName: 'slobo.eth',
      avatarUrl: null,
      votingPower: '210000000000000000000000',
      delegatorCount: 67,
      activeSince: '2022-08-01T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, false, true, true, true, true],
    },
    {
      address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
      ensName: 'alisha.eth',
      avatarUrl: null,
      votingPower: '180000000000000000000000',
      delegatorCount: 53,
      activeSince: '2023-01-10T00:00:00Z',
      last10ProposalsVoted: [true, false, true, true, true, true, true, true, true, true],
    },
    {
      address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      ensName: 'validator.eth',
      avatarUrl: null,
      votingPower: '95000000000000000000000',
      delegatorCount: 31,
      activeSince: '2023-04-22T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, false, true, true, true, true, false],
    },
    {
      address: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
      ensName: null,
      avatarUrl: null,
      votingPower: '72000000000000000000000',
      delegatorCount: 18,
      activeSince: '2023-06-05T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, false, true, true, true],
    },
  ],
}

const MOCK_ROUND: RoundInfoResponse = {
  roundNumber: 4,
  startDate: '2026-03-01T00:00:00Z',
  endDate: '2026-03-31T23:59:59Z',
  percentComplete: 87,
  daysRemaining: 4,
  poolSizeEns: '1000',
  tierIndex: 1,
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

  currentRound: () => delay(MOCK_ROUND),
} as const
