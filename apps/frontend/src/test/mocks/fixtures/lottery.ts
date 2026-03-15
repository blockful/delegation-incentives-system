import type { DistributionResponse } from '@/api/types'

export const distributionFixture: DistributionResponse = {
  month: '2025-01',
  metadata: {
    totalDistributed: '1500000000000000000000',
    totalDistributedEns: '1500.00',
    poolTier: {
      momGrowthMinBps: '500',
      momGrowthMaxBps: '1500',
      poolSize: '1000000000000000000000',
      delegateCap: '100000000000000000000',
      delegatorCap: '20000000000000000000',
    },
    momGrowthBps: '1240',
    activeDelegateCount: 47,
    eligibleDelegatorCount: 312,
    computedAt: '2025-02-01T00:00:00.000Z',
    randaoSeed:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  directPayouts: [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      amount: '50000000000000000000',
      amountEns: '50.00',
      role: 'delegate',
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      amount: '35000000000000000000',
      amountEns: '35.00',
      role: 'delegate',
    },
    {
      address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      amount: '12000000000000000000',
      amountEns: '12.00',
      role: 'delegator',
    },
  ],
  lotteryPools: [
    {
      totalPrize: '8000000000000000000',
      totalPrizeEns: '8.00',
      winner: '0x9876543210fedcba9876543210fedcba98765432',
      entries: [
        {
          address: '0x9876543210fedcba9876543210fedcba98765432',
          originalAmount: '3000000000000000000',
          role: 'delegator',
        },
        {
          address: '0x1111111111111111111111111111111111111111',
          originalAmount: '2500000000000000000',
          role: 'delegator',
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          originalAmount: '2500000000000000000',
          role: 'delegator',
        },
      ],
    },
  ],
}
