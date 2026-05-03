import type { RoundInfoResponse } from '@/api/types'

export const roundInfoFixture: RoundInfoResponse = {
  roundNumber: 3,
  startDate: '2026-05-01T00:00:00.000Z',
  endDate: '2026-05-31T23:59:59.999Z',
  percentComplete: 10,
  daysRemaining: 28,
  poolSizeEns: '5000.000000000000000000',
  tierIndex: 0,
  vpGrowthPct: '0.00',
}
