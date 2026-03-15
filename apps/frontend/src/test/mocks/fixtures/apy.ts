import type { ApyEstimateResponse } from '@/api/types'

export const apyFixture: ApyEstimateResponse = {
  address: '0x1234567890abcdef1234567890abcdef12345678',
  role: 'delegate',
  delegatedTo: null,
  currentTierIndex: 1,
  poolSizeEns: '1000',
  estimatedMonthlyRewardEns: '16.35',
  estimatedApyPct: '5.75',
  userWeight: '3410000000000000000',
  totalPoolWeight: '208700000000000000000',
  currentBalanceEns: '3.41',
}
