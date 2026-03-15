import type { ActiveDelegatesResponse } from '@/api/types'

export const delegatesFixture: ActiveDelegatesResponse = {
  count: 3,
  delegates: [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ensName: null,
      votingPower: '500000000000000000000',
      delegatorCount: 12,
      activeSince: null,
      last10ProposalsVoted: [true, true, true, false, true, true, true, true, false, true],
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: null,
      votingPower: '300000000000000000000',
      delegatorCount: 8,
      activeSince: null,
      last10ProposalsVoted: [true, true, true, true, true, true, true, true, true, true],
    },
    {
      address: '0x9876543210fedcba9876543210fedcba98765432',
      ensName: null,
      votingPower: '200000000000000000000',
      delegatorCount: 5,
      activeSince: null,
      last10ProposalsVoted: [true, false, true, true, true, true, true, false, true, true],
    },
  ],
}
