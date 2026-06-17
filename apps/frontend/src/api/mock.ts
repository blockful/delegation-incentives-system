import type {
  HealthResponse,
  StatusResponse,
  ActiveVotersResponse,
  EligibilityResponse,
  TierProgressionResponse,
  AprEstimateResponse,
  DistributionResponse,
  RoundInfoResponse,
  RoundListResponse,
  RoundDetailResponse,
  AddressDistributionHistoryResponse,
  AddressRoundReward,
  WordPoolResponse,
  SelectionResponse,
  MatchCountResponse,
  PutSelectionBody,
  PutSelectionResponse,
} from './types'

import { ApiClientError } from './client'

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

const MOCK_TIERS: TierProgressionResponse = {
  currentTotalVP: '1250000000000000000000000',
  previousTotalVP: '1112000000000000000000000',
  currentGrowthBps: '1240',
  currentGrowthPct: '12.40',
  currentTierIndex: 1,
  activeVoterCount: 47,
  maxTokenHolderAprPct: '120.00',
  tiers: [
    {
      index: 0,
      momGrowthMinPct: '0',
      momGrowthMaxPct: '10',
      poolSizeEns: '5000',
      voterCapEns: '50',
      tokenHolderCapEns: '250',
      isCurrent: false,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredTotalVP: '1112000000000000000000000',
      estimatedAprPct: '4.80',
    },
    {
      index: 1,
      momGrowthMinPct: '10',
      momGrowthMaxPct: '20',
      poolSizeEns: '8000',
      voterCapEns: '80',
      tokenHolderCapEns: '400',
      isCurrent: true,
      isUnlocked: true,
      additionalVPNeeded: '0',
      requiredTotalVP: '1223200000000000000000000',
      estimatedAprPct: '8.64',
    },
    {
      index: 2,
      momGrowthMinPct: '20',
      momGrowthMaxPct: '30',
      poolSizeEns: '10000',
      voterCapEns: '100',
      tokenHolderCapEns: '500',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '84200000000000000000000',
      requiredTotalVP: '1334400000000000000000000',
      estimatedAprPct: '15.65',
    },
    {
      index: 3,
      momGrowthMinPct: '30',
      momGrowthMaxPct: '50',
      poolSizeEns: '15000',
      voterCapEns: '150',
      tokenHolderCapEns: '750',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '195400000000000000000000',
      requiredTotalVP: '1445600000000000000000000',
      estimatedAprPct: '27.00',
    },
    {
      index: 4,
      momGrowthMinPct: '50',
      momGrowthMaxPct: '75',
      poolSizeEns: '20000',
      voterCapEns: '200',
      tokenHolderCapEns: '1000',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '418000000000000000000000',
      requiredTotalVP: '1668000000000000000000000',
      estimatedAprPct: '46.29',
    },
    {
      index: 5,
      momGrowthMinPct: '75',
      momGrowthMaxPct: '100',
      poolSizeEns: '25000',
      voterCapEns: '250',
      tokenHolderCapEns: '1250',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '696000000000000000000000',
      requiredTotalVP: '1946000000000000000000000',
      estimatedAprPct: '80.00',
    },
    {
      index: 6,
      momGrowthMinPct: '100',
      momGrowthMaxPct: 'Infinity',
      poolSizeEns: '30000',
      voterCapEns: '300',
      tokenHolderCapEns: '1500',
      isCurrent: false,
      isUnlocked: false,
      additionalVPNeeded: '974000000000000000000000',
      requiredTotalVP: '2224000000000000000000000',
      estimatedAprPct: '120.00',
    },
  ],
}

// ENS metadata service serves real avatars by name; falls back gracefully if unset.
const ensAvatar = (name: string) => `https://metadata.ens.domains/mainnet/avatar/${name}`

const MOCK_PROPOSAL_TITLES = [
  'EP 6.6 — [Executable] Working Group budgets, Term 6',
  'EP 6.5 — [Social] Service Provider Program renewal',
  'EP 6.4 — [Executable] Public Goods WG funding allocation',
  'EP 6.3 — [Social] Term 6 Steward elections',
  'EP 6.2 — [Executable] Ecosystem WG quarterly budget',
  'EP 6.1 — [Social] Endorse Term 6 Working Group Stewards',
  'EP 5.31 — [Executable] Q4 governance facilitation budget',
  'EP 5.30 — [Social] Service Provider Stream amendment',
  'EP 5.29 — [Executable] Security audit budget approval',
  'EP 5.28 — [Social] Constitution amendment — voting periods',
] as const

const MOCK_PROPOSAL_IDS = [
  '39893466662181856279242827854933926689925858494049650894234231038376231891860',
  '85714230187321904471028836259741268340985717625190837624089417823625781421003',
  '12471203487123048712304871230487123048712304871230487123048712304871230487',
  '74028371203748120374812037481203748120374812037481203748120374812037481203',
  '38419283749182748392174839218374839218374839218374839218374839218374839218',
  '90218374921837492183749218374921837492183749218374921837492183749218374921',
  '52830192837492837410293847102938471029384710293847102938471029384710293847',
  '67419283746192837461928374619283746192837461928374619283746192837461928374',
  '18374619283746192837461928374619283746192837461928374619283746192837461928',
  '29384710293847102938471029384710293847102938471029384710293847102938471029',
] as const

const MOCK_PROPOSAL_STATUSES = [
  'executed', 'executed', 'defeated', 'executed', 'executed',
  'executed', 'defeated', 'executed', 'executed', 'executed',
] as const

function buildMockProposals(voted: boolean[]) {
  return voted.map((v, i) => ({
    proposalId: MOCK_PROPOSAL_IDS[i],
    title: MOCK_PROPOSAL_TITLES[i],
    status: MOCK_PROPOSAL_STATUSES[i],
    // Mock: voters who voted are mostly "For"; a couple of "Against" sprinkled in via index parity.
    voterSupport: v ? (i % 5 === 2 ? 0 : i % 7 === 3 ? 2 : 1) : null,
  }))
}

const MOCK_VOTERS_BASE = [
    {
      address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      ensName: 'nick.eth',
      avatarUrl: ensAvatar('nick.eth'),
      votingPower: '450000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 214,
      activeSince: '2022-03-15T00:00:00Z',
      last10ProposalsVoted: [true, true, true, false, true, true, true, true, false, true],
    },
    {
      address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      ensName: 'avsa.eth',
      avatarUrl: ensAvatar('avsa.eth'),
      votingPower: '320000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 98,
      activeSince: '2022-05-20T00:00:00Z',
      last10ProposalsVoted: [true, true, false, true, true, true, true, true, true, true],
    },
    {
      address: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
      ensName: 'slobo.eth',
      avatarUrl: ensAvatar('slobo.eth'),
      votingPower: '210000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 67,
      activeSince: '2022-08-01T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, false, true, true, true, true],
    },
    {
      address: '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
      ensName: 'alisha.eth',
      avatarUrl: ensAvatar('alisha.eth'),
      votingPower: '180000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 53,
      activeSince: '2023-01-10T00:00:00Z',
      last10ProposalsVoted: [true, false, true, true, true, true, true, true, true, true],
    },
    {
      address: '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
      ensName: 'validator.eth',
      avatarUrl: ensAvatar('validator.eth'),
      votingPower: '95000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 31,
      activeSince: '2023-04-22T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, false, true, true, true, true, false],
    },
    {
      address: '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
      ensName: null,
      avatarUrl: null,
      votingPower: '72000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 18,
      activeSince: '2023-06-05T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, false, true, true, true],
    },
    {
      address: '0x7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b',
      ensName: 'brantly.eth',
      avatarUrl: ensAvatar('brantly.eth'),
      votingPower: '65000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 22,
      activeSince: '2022-11-12T00:00:00Z',
      last10ProposalsVoted: [true, true, false, true, true, true, true, true, true, false],
    },
    {
      address: '0x8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c',
      ensName: 'griff.eth',
      avatarUrl: ensAvatar('griff.eth'),
      votingPower: '58000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 14,
      activeSince: '2023-02-18T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, false, true, true, true, true],
    },
    {
      address: '0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d',
      ensName: 'jefflau.eth',
      avatarUrl: ensAvatar('jefflau.eth'),
      votingPower: '52000000000000000000000',
      votesInLast10: 7,
      tokenHolderCount: 11,
      activeSince: '2022-09-30T00:00:00Z',
      last10ProposalsVoted: [true, false, true, true, true, true, false, true, true, true],
    },
    {
      address: '0x0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e',
      ensName: 'limes.eth',
      avatarUrl: ensAvatar('limes.eth'),
      votingPower: '44000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 17,
      activeSince: '2023-03-08T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, false, true, true, true, true, true],
    },
    {
      address: '0x1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f',
      ensName: 'she256.eth',
      avatarUrl: ensAvatar('she256.eth'),
      votingPower: '39000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 9,
      activeSince: '2023-05-14T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, true, false, true, false],
    },
    {
      address: '0x2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a',
      ensName: 'simona.eth',
      avatarUrl: ensAvatar('simona.eth'),
      votingPower: '36000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 13,
      activeSince: '2023-01-25T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, false, true, true, true],
    },
    {
      address: '0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
      ensName: 'leontalbert.eth',
      avatarUrl: ensAvatar('leontalbert.eth'),
      votingPower: '32000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 8,
      activeSince: '2023-07-02T00:00:00Z',
      last10ProposalsVoted: [false, true, true, true, true, true, true, true, false, true],
    },
    {
      address: '0x4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
      ensName: 'spencecoin.eth',
      avatarUrl: ensAvatar('spencecoin.eth'),
      votingPower: '28000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 12,
      activeSince: '2022-12-19T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, false, true, true, true, true],
    },
    {
      address: '0x5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
      ensName: 'fireeyesdao.eth',
      avatarUrl: ensAvatar('fireeyesdao.eth'),
      votingPower: '25000000000000000000000',
      votesInLast10: 7,
      tokenHolderCount: 7,
      activeSince: '2023-04-04T00:00:00Z',
      last10ProposalsVoted: [true, false, true, true, false, true, true, true, true, true],
    },
    {
      address: '0x6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e',
      ensName: 'coinbase.eth',
      avatarUrl: ensAvatar('coinbase.eth'),
      votingPower: '22000000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 6,
      activeSince: '2023-08-21T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, true, true, false, true, false, true],
    },
    {
      address: '0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f',
      ensName: 'wslyvh.eth',
      avatarUrl: ensAvatar('wslyvh.eth'),
      votingPower: '18000000000000000000000',
      votesInLast10: 9,
      tokenHolderCount: 5,
      activeSince: '2023-06-17T00:00:00Z',
      last10ProposalsVoted: [true, true, true, true, false, true, true, true, true, true],
    },
  ]

// Sample matchmaking selections for the first few mock voters (word ids match
// the backend pool). The rest are left unselected (null) to exercise the
// "delegate hasn't picked" state. Used only in mock mode.
const MOCK_VOTER_SELECTIONS: (string[] | null)[] = [
  ["security", "decentralization", "public_goods_funding", "transparency", "open_source"],
  ["security", "decentralization", "public_goods_funding", "transparency", "credible_neutrality"],
  ["growth_investment", "treasury_growth", "ecosystem_funding", "cost_efficiency", "interoperability"],
]

const MOCK_VOTERS: ActiveVotersResponse = {
  count: MOCK_VOTERS_BASE.length,
  voters: MOCK_VOTERS_BASE.map((v, i) => ({
    ...v,
    last10Proposals: buildMockProposals(v.last10ProposalsVoted),
    words: MOCK_VOTER_SELECTIONS[i] ?? null,
  })),
}

// Mirror of the backend placeholder pool (ids must match for selections to validate).
const MOCK_WORD_POOL: WordPoolResponse = {
  pool: [
    { id: 'security', label: 'Security' },
    { id: 'cost_efficiency', label: 'Cost efficiency' },
    { id: 'growth_investment', label: 'Growth investment' },
    { id: 'decentralization', label: 'Decentralization' },
    { id: 'public_goods_funding', label: 'Public goods funding' },
    { id: 'transparency', label: 'Transparency' },
    { id: 'credible_neutrality', label: 'Credible neutrality' },
    { id: 'censorship_resistance', label: 'Censorship resistance' },
    { id: 'user_privacy', label: 'User privacy' },
    { id: 'developer_experience', label: 'Developer experience' },
    { id: 'treasury_growth', label: 'Treasury growth' },
    { id: 'community_governance', label: 'Community governance' },
    { id: 'protocol_simplicity', label: 'Protocol simplicity' },
    { id: 'long_term_vision', label: 'Long-term vision' },
    { id: 'ecosystem_funding', label: 'Ecosystem funding' },
    { id: 'self_custody', label: 'Self custody' },
    { id: 'open_source', label: 'Open source' },
    { id: 'accessibility', label: 'Accessibility' },
    { id: 'sustainability', label: 'Sustainability' },
    { id: 'interoperability', label: 'Interoperability' },
  ],
}

// In-memory selection store so PUT persists within a mock session. Seeded from
// the sample voter selections so profiles/cards show match data in mock mode.
const mockSelectionStore = new Map<string, string[]>()
MOCK_VOTERS_BASE.forEach((v, i) => {
  const sel = MOCK_VOTER_SELECTIONS[i]
  if (sel) mockSelectionStore.set(v.address.toLowerCase(), sel)
})

/**
 * Mock ENS text records for the seeded voters above.
 * Keyed by lowercased address. Read by VoterProfilePage when env.useMockApi is true
 * so the bio + verified-link chips render without a working mainnet RPC.
 */
/**
 * Mock reverse-resolution for ENS names → addresses.
 * Used by VoterProfilePage when env.useMockApi is true so navigating to
 * /voters/nick.eth (etc.) resolves locally instead of hanging on wagmi
 * waiting for a mainnet RPC.
 */
export const MOCK_ENS_TO_ADDRESS: Record<string, string> = {
  'nick.eth': '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  'avsa.eth': '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
  'slobo.eth': '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  'alisha.eth': '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e',
  'validator.eth': '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f',
  'nameless.eth': '0x6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a',
}

export const MOCK_ENS_PROFILES: Record<
  string,
  { description?: string; twitter?: string; url?: string }
> = {
  '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b': {
    description:
      'Building ENS. Caring for the namespace. Mostly opinions, occasionally good ones. Working on making web3 less painful, one resolver at a time.',
    twitter: 'nicksdjohnson',
    url: 'ens.domains',
  },
  '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c': {
    description:
      'ENS Labs co-founder. Focused on governance, integrations, and the long-term sustainability of the ENS DAO.',
    twitter: 'avsa',
    url: 'avsa.io',
  },
  '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d': {
    description:
      'Long-time ENS community member and active governance participant. I vote on every proposal and write public reasoning.',
    twitter: 'slobo_eth',
  },
  '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e': {
    description:
      'Independent delegate. Engineering background, focused on protocol upgrades and treasury responsibility.',
    url: 'alisha.xyz',
  },
  '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f': {
    description:
      'Validator-operator delegate. Vote on infra, security, and ecosystem health proposals.',
    twitter: 'validator_eth',
  },
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
      voterCap: '80000000000000000000',
      tokenHolderCap: '15000000000000000000',
    },
    momGrowthBps: '909',
    activeVoterCount: 38,
    eligibleTokenHolderCount: 214,
    computedAt: '2026-03-01T00:05:00Z',
    randaoSeed: '0xdeadbeef',
  },
  directPayouts: [
    {
      address: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
      ensName: 'nick.eth',
      amount: '12340000000000000000',
      amountEns: '12.34',
      role: 'voter',
    },
    {
      address: '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c',
      ensName: 'avsa.eth',
      amount: '8760000000000000000',
      amountEns: '8.76',
      role: 'voter',
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
          role: 'token_holder',
        },
      ],
    },
  ],
}

const MOCK_ROUNDS: RoundListResponse = {
  currentRoundNumber: 3,
  rounds: [
    {
      roundNumber: 3,
      month: '2026-05',
      startDate: '2026-05-01T00:00:00.000Z',
      endDate: '2026-05-31T23:59:59.999Z',
      status: 'live',
      distributionDataStatus: 'in_progress',
      isCurrent: true,
      percentComplete: 10,
      daysRemaining: 28,
      tierIndex: 0,
      tierLabel: 'Tier #1',
      vpGrowthPct: '0.00',
      poolSize: '5000000000000000000000',
      poolSizeEns: '5000.000000000000000000',
      totalDistributed: null,
      totalDistributedEns: null,
      activeVoterCount: null,
      eligibleTokenHolderCount: null,
      lotteryBucketCount: null,
      lotteryEntryCount: null,
      lotteryParticipantCount: null,
      lotteryWinnerCount: null,
      lotteryPrize: null,
      lotteryPrizeEns: null,
      computedAt: null,
    },
    {
      roundNumber: 2,
      month: '2026-04',
      startDate: '2026-04-01T00:00:00.000Z',
      endDate: '2026-04-30T23:59:59.999Z',
      status: 'paid',
      distributionDataStatus: 'available',
      isCurrent: false,
      percentComplete: 100,
      daysRemaining: 0,
      tierIndex: 1,
      tierLabel: 'Tier #2',
      vpGrowthPct: '20.00',
      poolSize: '8000000000000000000000',
      poolSizeEns: '8000.000000000000000000',
      totalDistributed: '7820000000000000000000',
      totalDistributedEns: '7820.000000000000000000',
      activeVoterCount: 42,
      eligibleTokenHolderCount: 312,
      lotteryBucketCount: 4,
      lotteryEntryCount: 48,
      lotteryParticipantCount: 48,
      lotteryWinnerCount: 4,
      lotteryPrize: '40000000000000000000',
      lotteryPrizeEns: '40.000000000000000000',
      computedAt: '2026-05-01T00:00:00.000Z',
    },
    {
      roundNumber: 1,
      month: '2026-03',
      startDate: '2026-03-01T00:00:00.000Z',
      endDate: '2026-03-31T23:59:59.999Z',
      status: 'paid',
      distributionDataStatus: 'available',
      isCurrent: false,
      percentComplete: 100,
      daysRemaining: 0,
      tierIndex: 0,
      tierLabel: 'Tier #1',
      vpGrowthPct: '8.50',
      poolSize: '5000000000000000000000',
      poolSizeEns: '5000.000000000000000000',
      totalDistributed: '4910000000000000000000',
      totalDistributedEns: '4910.000000000000000000',
      activeVoterCount: 36,
      eligibleTokenHolderCount: 248,
      lotteryBucketCount: 2,
      lotteryEntryCount: 26,
      lotteryParticipantCount: 26,
      lotteryWinnerCount: 2,
      lotteryPrize: '20000000000000000000',
      lotteryPrizeEns: '20.000000000000000000',
      computedAt: '2026-04-01T00:00:00.000Z',
    },
    {
      roundNumber: 0,
      month: '2026-02',
      startDate: '2026-02-01T00:00:00.000Z',
      endDate: '2026-02-28T23:59:59.999Z',
      status: 'paid',
      distributionDataStatus: 'available',
      isCurrent: false,
      percentComplete: 100,
      daysRemaining: 0,
      tierIndex: 0,
      tierLabel: 'Tier #1',
      vpGrowthPct: '4.20',
      poolSize: '5000000000000000000000',
      poolSizeEns: '5000.000000000000000000',
      totalDistributed: '4880000000000000000000',
      totalDistributedEns: '4880.000000000000000000',
      activeVoterCount: 33,
      eligibleTokenHolderCount: 198,
      lotteryBucketCount: 2,
      lotteryEntryCount: 22,
      lotteryParticipantCount: 22,
      lotteryWinnerCount: 2,
      lotteryPrize: '20000000000000000000',
      lotteryPrizeEns: '20.000000000000000000',
      computedAt: '2026-03-01T00:00:00.000Z',
    },
  ],
}

/**
 * Per-voter, per-round mock reward amounts (voter share of the 10% pool).
 * Keyed by lowercased voter address, then round number.
 * Powers the Rewards History strip on VoterProfilePage and the
 * connected user's history on Dashboard.
 */
const MOCK_VOTER_REWARDS: Record<string, Record<number, string>> = {
  '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b': { 2: '24.50', 1: '18.20', 0: '15.40' },
  '0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c': { 2: '17.80', 1: '13.50', 0: '11.20' },
  '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d': { 2: '11.70', 1: '8.90', 0: '7.40' },
  '0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e': { 2: '10.00', 1: '7.50', 0: '6.20' },
  '0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f': { 2: '5.20', 1: '3.90', 0: '3.30' },
}

function buildMockAddressReward(
  address: string,
  roundNumber: number,
): AddressRoundReward | null {
  const lower = address.toLowerCase()
  const reward = MOCK_VOTER_REWARDS[lower]?.[roundNumber]
  if (!reward) return null
  const wei = (parseFloat(reward) * 1e18).toString()
  return {
    address: lower,
    rewardStatus: 'paid',
    voterReward: wei,
    voterRewardEns: reward,
    tokenHolderReward: '0',
    tokenHolderRewardEns: '0',
    lotteryReward: '0',
    lotteryRewardEns: '0',
    totalReward: wei,
    totalRewardEns: reward,
  }
}

const MOCK_ADDRESS_HISTORY: AddressDistributionHistoryResponse = {
  address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
  rounds: MOCK_ROUNDS.rounds.map((round) => ({
    roundNumber: round.roundNumber,
    month: round.month,
    startDate: round.startDate,
    endDate: round.endDate,
    roundStatus: round.status,
    distributionDataStatus: round.distributionDataStatus,
    address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
    rewardStatus: round.isCurrent ? 'pending' : 'unavailable',
    voterReward: '0',
    voterRewardEns: '0.000000000000000000',
    tokenHolderReward: '0',
    tokenHolderRewardEns: '0.000000000000000000',
    lotteryReward: '0',
    lotteryRewardEns: '0.000000000000000000',
    totalReward: '0',
    totalRewardEns: '0.000000000000000000',
  })),
}

const MOCK_ROUND_DETAIL: RoundDetailResponse = {
  ...MOCK_ROUNDS.rounds[0],
  addressReward: null,
  topVoterRewards: [],
  topTokenHolderRewards: [],
  lottery: null,
}

const MOCK_PAID_ROUND_DETAIL: RoundDetailResponse = {
  ...MOCK_ROUNDS.rounds[1],
  addressReward: null,
  topVoterRewards: [],
  topTokenHolderRewards: [],
  lottery: {
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
    entryCount: 12,
    participantCount: 12,
    winnerCount: 1,
    buckets: [
      {
        bucketIndex: 0,
        prize: '10000000000000000000',
        prizeEns: '10.000000000000000000',
        winner: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
        winnerEnsName: null,
        winnerProbability: '0.0990',
        entryCount: 12,
        entries: [
          {
            bucketIndex: 0,
            entryIndex: 1,
            address: '0xd8da6bf26964af9d7eed9e03e53415d37aa96045',
            ensName: null,
            amount: '990000000000000000',
            amountEns: '0.990000000000000000',
            probability: '0.0990',
          },
          {
            bucketIndex: 0,
            entryIndex: 2,
            address: '0xffffffffffffffffffffffffffffffffffffffff',
            ensName: 'holder-eleven.eth',
            amount: '940000000000000000',
            amountEns: '0.940000000000000000',
            probability: '0.0940',
          },
          {
            bucketIndex: 0,
            entryIndex: 3,
            address: '0x3333333333333333333333333333333333333333',
            ensName: 'holder-three.eth',
            amount: '910000000000000000',
            amountEns: '0.910000000000000000',
            probability: '0.0910',
          },
          {
            bucketIndex: 0,
            entryIndex: 4,
            address: '0x4444444444444444444444444444444444444444',
            ensName: 'holder-four.eth',
            amount: '880000000000000000',
            amountEns: '0.880000000000000000',
            probability: '0.0880',
          },
          {
            bucketIndex: 0,
            entryIndex: 5,
            address: '0x5555555555555555555555555555555555555555',
            ensName: 'holder-five.eth',
            amount: '860000000000000000',
            amountEns: '0.860000000000000000',
            probability: '0.0860',
          },
          {
            bucketIndex: 0,
            entryIndex: 6,
            address: '0x6666666666666666666666666666666666666666',
            ensName: 'holder-six.eth',
            amount: '840000000000000000',
            amountEns: '0.840000000000000000',
            probability: '0.0840',
          },
          {
            bucketIndex: 0,
            entryIndex: 7,
            address: '0x7777777777777777777777777777777777777777',
            ensName: 'holder-seven.eth',
            amount: '820000000000000000',
            amountEns: '0.820000000000000000',
            probability: '0.0820',
          },
          {
            bucketIndex: 0,
            entryIndex: 8,
            address: '0x8888888888888888888888888888888888888888',
            ensName: 'holder-eight.eth',
            amount: '800000000000000000',
            amountEns: '0.800000000000000000',
            probability: '0.0800',
          },
          {
            bucketIndex: 0,
            entryIndex: 9,
            address: '0x9999999999999999999999999999999999999999',
            ensName: 'holder-nine.eth',
            amount: '780000000000000000',
            amountEns: '0.780000000000000000',
            probability: '0.0780',
          },
          {
            bucketIndex: 0,
            entryIndex: 10,
            address: '0x1010101010101010101010101010101010101010',
            ensName: 'holder-ten.eth',
            amount: '760000000000000000',
            amountEns: '0.760000000000000000',
            probability: '0.0760',
          },
          {
            bucketIndex: 0,
            entryIndex: 11,
            address: '0x1111111111111111111111111111111111111111',
            ensName: 'holder-eleven-small.eth',
            amount: '720000000000000000',
            amountEns: '0.720000000000000000',
            probability: '0.0720',
          },
          {
            bucketIndex: 0,
            entryIndex: 12,
            address: '0x1212121212121212121212121212121212121212',
            ensName: 'holder-twelve.eth',
            amount: '700000000000000000',
            amountEns: '0.700000000000000000',
            probability: '0.0700',
          },
        ],
      },
    ],
  },
}

export const mockApi = {
  health: () => delay<HealthResponse>({ status: 'ok' }),

  status: () =>
    delay<StatusResponse>({
      activeVoterCount: 38,
      proposalCount: 52,
      cachedDistributions: ['2026-02', '2026-01', '2025-12'],
      totalDelegatedEns: '1250000.000000000000000000',
      holdersEarning: 412,
    }),

  activeVoters: () => delay(MOCK_VOTERS),

  eligibility: (_address: string) =>
    delay<EligibilityResponse>({
      address: _address,
      ensName: null,
      isActiveVoter: false,
      isTokenHolderOfActiveVoter: false,
      eligible: false,
      delegatedTo: null,
      delegatedToEnsName: null,
      source: null,
    }),

  tierProgression: () => delay(MOCK_TIERS),

  apr: (_address: string) =>
    delay<AprEstimateResponse>({
      address: _address,
      ensName: null,
      avatarUrl: null,
      role: 'ineligible',
      delegatedTo: null,
      delegatedToEnsName: null,
      delegatedToAvatarUrl: null,
      poolSizeEns: '1000',
      estimatedMonthlyRewardEns: '0',
      estimatedAprPct: '0',
      userShareWei: '0',
      totalShareWei: '0',
      currentBalanceEns: '0',
      qualifiesForLottery: false,
    }),

  distributionList: () => delay<string[]>(['2026-02', '2026-01', '2025-12']),

  distribution: (_month: string) => delay(MOCK_DISTRIBUTION),

  distributionsForAddress: (_address: string) => delay(MOCK_ADDRESS_HISTORY),

  currentRound: () => delay(createMockRound()),

  rounds: () => delay(MOCK_ROUNDS),

  round: (roundNumber: number, address?: string) => {
    const addressReward = address ? buildMockAddressReward(address, roundNumber) : null

    if (roundNumber === 2) {
      return delay({ ...MOCK_PAID_ROUND_DETAIL, addressReward })
    }

    const summary = MOCK_ROUNDS.rounds.find((round) => round.roundNumber === roundNumber)
      ?? MOCK_ROUNDS.rounds[0]
    return delay({
      ...MOCK_ROUND_DETAIL,
      ...summary,
      addressReward,
    })
  },

  wordPool: () => delay<WordPoolResponse>(MOCK_WORD_POOL),

  selection: (address: string) => {
    const words = mockSelectionStore.get(address.toLowerCase())
    if (!words) {
      return Promise.reject(new ApiClientError(404, 'No selection for this address'))
    }
    return delay<SelectionResponse>({
      address: address.toLowerCase(),
      words,
      updatedAt: 1781619462005,
    })
  },

  matchCount: (_address: string) =>
    delay<MatchCountResponse>({ matchCount: 2, matchingActiveVoters: 1 }),

  putSelection: (address: string, body: PutSelectionBody) => {
    mockSelectionStore.set(address.toLowerCase(), body.words)
    return delay<PutSelectionResponse>({
      address: address.toLowerCase(),
      words: body.words,
      updatedAt: 1781619462005,
    })
  },

  downloadDistributionCsv: (month: string): void => {
    const csv = buildMockDistributionCsv(MOCK_DISTRIBUTION)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const objectUrl = URL.createObjectURL(blob)
    triggerMockBrowserDownload(objectUrl, `distribution-${month}.csv`)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 0)
  },
} as const

function buildMockDistributionCsv(dist: DistributionResponse): string {
  const header = 'address,voter_reward,token_holder_reward,combined_reward,role,payout_type'
  const lines: string[] = [header]

  const lotteryWinners = new Set(
    dist.lotteryPools.map((pool) => pool.winner.toLowerCase()),
  )
  const directAddresses = new Set<string>()

  for (const payout of dist.directPayouts) {
    directAddresses.add(payout.address.toLowerCase())
    const voterReward = payout.role === 'voter' ? payout.amount : '0'
    const tokenHolderReward = payout.role === 'token_holder' ? payout.amount : '0'
    const payoutType = lotteryWinners.has(payout.address.toLowerCase()) ? 'lottery' : 'direct'
    lines.push(
      [payout.address, voterReward, tokenHolderReward, payout.amount, payout.role, payoutType].join(','),
    )
  }

  for (const pool of dist.lotteryPools) {
    if (directAddresses.has(pool.winner.toLowerCase())) continue
    lines.push(
      [pool.winner, '0', '0', pool.totalPrize, 'token_holder', 'lottery'].join(','),
    )
  }

  return lines.join('\n') + '\n'
}

function triggerMockBrowserDownload(href: string, filename: string): void {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = filename
  anchor.rel = 'noopener'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}
