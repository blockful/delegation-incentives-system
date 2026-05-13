import type { StatusResponse } from '@/api/types'

export const statusFixture: StatusResponse = {
  activeVoterCount: 47,
  proposalCount: 10,
  cachedDistributions: ['2025-01', '2025-02'],
  totalDelegatedEns: '1250000.000000000000000000',
  holdersEarning: 412,
}
