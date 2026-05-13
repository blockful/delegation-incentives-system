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
      voterCap: '100000000000000000000',
      tokenHolderCap: '20000000000000000000',
    },
    momGrowthBps: '1240',
    activeVoterCount: 47,
    eligibleTokenHolderCount: 312,
    computedAt: '2025-02-01T00:00:00.000Z',
    randaoSeed:
      '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  },
  directPayouts: [
    {
      address: '0x1234567890abcdef1234567890abcdef12345678',
      ensName: null,
      amount: '50000000000000000000',
      amountEns: '50.00',
      role: 'voter',
    },
    {
      address: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
      ensName: null,
      amount: '35000000000000000000',
      amountEns: '35.00',
      role: 'voter',
    },
    {
      address: '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      ensName: null,
      amount: '12000000000000000000',
      amountEns: '12.00',
      role: 'token_holder',
    },
  ],
  lotteryPools: [
    {
      totalPrize: '8000000000000000000',
      totalPrizeEns: '8.00',
      winner: '0x9876543210fedcba9876543210fedcba98765432',
      winnerEnsName: null,
      entries: [
        {
          address: '0x9876543210fedcba9876543210fedcba98765432',
          ensName: null,
          originalAmount: '3000000000000000000',
          role: 'token_holder',
        },
        {
          address: '0x1111111111111111111111111111111111111111',
          ensName: null,
          originalAmount: '2500000000000000000',
          role: 'token_holder',
        },
        {
          address: '0x2222222222222222222222222222222222222222',
          ensName: null,
          originalAmount: '2500000000000000000',
          role: 'token_holder',
        },
      ],
    },
  ],
}
