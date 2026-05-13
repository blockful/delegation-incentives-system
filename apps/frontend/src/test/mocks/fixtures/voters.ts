import type { ActiveVotersResponse } from '@/api/types'

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
      last10ProposalsVoted: [true, true, true, false, true, true, true, true, false, true],
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: null,
      avatarUrl: null,
      votingPower: '300000000000000000000',
      votesInLast10: 10,
      tokenHolderCount: 8,
      activeSince: null,
      last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, true],
    },
    {
      address: '0x9876543210fedcba9876543210fedcba98765432',
      ensName: null,
      avatarUrl: null,
      votingPower: '200000000000000000000',
      votesInLast10: 8,
      tokenHolderCount: 5,
      activeSince: null,
      last10ProposalsVoted: [true, false, true, true, true, true, true, false, true, true],
    },
  ],
}
