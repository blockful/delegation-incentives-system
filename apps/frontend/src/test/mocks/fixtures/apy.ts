import type { ApyEstimateResponse } from '@/api/types'

export const apyFixture: ApyEstimateResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  ensName: null,
  avatarUrl: null,
  role: 'delegate',
  delegatedTo: null,
  delegatedToEnsName: null,
  delegatedToAvatarUrl: null,
  poolSizeEns: '1000',
  estimatedMonthlyRewardEns: '16.35',
  estimatedApyPct: '5.75',
  userShareWei: '3410000000000000000',
  totalShareWei: '208700000000000000000',
  currentBalanceEns: '3.41',
}
