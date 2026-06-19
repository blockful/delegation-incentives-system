import type { ActiveVotersResponse } from '@/api/types'

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

const MOCK_STATUSES = ['executed', 'executed', 'defeated', 'executed', 'executed', 'executed', 'defeated', 'executed', 'executed', 'executed'] as const

function buildMockProposals(voted: boolean[], supports: (number | null)[]) {
  return voted.map((_v, i) => ({
    proposalId: MOCK_PROPOSAL_IDS[i],
    title: MOCK_PROPOSAL_TITLES[i],
    status: MOCK_STATUSES[i],
    voterSupport: supports[i] ?? null,
  }))
}

const voter1Voted = [true, true, true, false, true, true, true, true, false, true]
const voter1Supports = [1, 1, 0, null, 1, 1, 1, 2, null, 1]

const voter2Voted = [true, true, true, true, true, true, true, true, true, true]
const voter2Supports = [1, 1, 1, 1, 1, 0, 1, 1, 1, 2]

const voter3Voted = [true, false, true, true, true, true, true, false, true, true]
const voter3Supports = [1, null, 1, 0, 1, 1, 2, null, 1, 1]

export const votersFixture: ActiveVotersResponse = {
  count: 3,
  voters: [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ensName: null,
      avatarUrl: null,
      votingPower: '500000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 12,
      activeSince: null,
      last10ProposalsVoted: voter1Voted,
      last10Proposals: buildMockProposals(voter1Voted, voter1Supports),
      words: null,
      match: null,
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: null,
      avatarUrl: null,
      votingPower: '300000000000000000000',
      votesInLast10: 10,
      tokenHolderCount: 8,
      activeSince: null,
      last10ProposalsVoted: voter2Voted,
      last10Proposals: buildMockProposals(voter2Voted, voter2Supports),
      words: null,
      match: null,
    },
    {
      address: '0x9876543210fedcba9876543210fedcba98765432',
      ensName: null,
      avatarUrl: null,
      votingPower: '200000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 5,
      activeSince: null,
      last10ProposalsVoted: voter3Voted,
      last10Proposals: buildMockProposals(voter3Voted, voter3Supports),
      words: null,
      match: null,
    },
  ],
}
