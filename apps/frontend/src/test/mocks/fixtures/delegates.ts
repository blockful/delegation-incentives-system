import type { ActiveDelegatesResponse } from '@/api/types'

export const delegatesFixture: ActiveDelegatesResponse = {
  count: 3,
  delegates: [
    '0x1234567890abcdef1234567890abcdef12345678',
    '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
    '0x9876543210fedcba9876543210fedcba98765432',
  ],
}
