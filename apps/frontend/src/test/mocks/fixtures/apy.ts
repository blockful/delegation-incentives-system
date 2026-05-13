import type { ApyEstimateResponse } from '@/api/types'

export const apyFixture: ApyEstimateResponse = {
  address: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
  ensName: 'vitalik.eth',
  avatarUrl: null,
  role: 'token_holder',
  delegatedTo: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
  delegatedToEnsName: 'nick.eth',
  delegatedToAvatarUrl: null,
  poolSizeEns: '5000',
  estimatedMonthlyRewardEns: '16.35',
  estimatedApyPct: '3.95',
  userShareWei: '3410000000000000000000',
  totalShareWei: '208700000000000000000000',
  currentBalanceEns: '1523.41',
  qualifiesForLottery: false,
}
