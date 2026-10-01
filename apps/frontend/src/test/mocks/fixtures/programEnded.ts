import type {
  AddressDistributionHistoryResponse,
  AprEstimateResponse,
  RoundInfoResponse,
  RoundListResponse,
  RoundSummary,
  TierProgressionResponse,
} from '@/api/types'
import { aprFixture } from './apr'
import { roundsFixture } from './rounds'

/*
 * The program after its last round settled, mirroring prod on 2026-10-01:
 * three paid rounds (5K / 5K / 8K ENS), no current round. Each endpoint comes
 * in two shapes: the extended backend (`programEnded` + settled values) and
 * the older one, which omits the flag and keeps returning a live projection
 * for the current calendar month.
 */

function settledRound(
  roundNumber: number,
  month: string,
  tierIndex: number,
  poolEns: string,
): RoundSummary {
  const [y, m] = month.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return {
    roundNumber,
    month,
    startDate: `${month}-01T00:00:00.000Z`,
    endDate: `${month}-${String(lastDay).padStart(2, '0')}T23:59:59.999Z`,
    status: 'paid',
    distributionDataStatus: 'available',
    isCurrent: false,
    percentComplete: 100,
    daysRemaining: 0,
    tierIndex,
    tierLabel: `Tier #${tierIndex + 1}`,
    vpGrowthPct: '1.00',
    poolSize: `${poolEns}000000000000000000`,
    poolSizeEns: `${poolEns}.000000000000000000`,
    totalDistributed: `${poolEns}000000000000000000`,
    totalDistributedEns: `${poolEns}.000000000000000000`,
    activeVoterCount: 40,
    eligibleTokenHolderCount: 600,
    lotteryBucketCount: 30,
    lotteryEntryCount: 1500,
    lotteryParticipantCount: 1500,
    lotteryWinnerCount: 30,
    lotteryPrize: '300000000000000000000',
    lotteryPrizeEns: '300.000000000000000000',
    computedAt: '2026-10-01T00:16:57.000Z',
  }
}

export const endedRoundListFixture: RoundListResponse = {
  currentRoundNumber: null,
  rounds: [
    settledRound(3, '2026-09', 1, '8000'),
    settledRound(2, '2026-08', 0, '5000'),
    settledRound(1, '2026-07', 0, '5000'),
  ],
}

/** Extended backend: last round with its settled values. */
export const endedRoundInfoFixture: RoundInfoResponse = {
  roundNumber: 3,
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-09-30T23:59:59.999Z',
  percentComplete: 100,
  daysRemaining: 0,
  poolSizeEns: '8000.000000000000000000',
  tierIndex: 1,
  vpGrowthPct: '15.19',
  status: 'paid',
  programEnded: true,
}

/** Older backend: last round number paired with October's live projection. */
export const legacyEndedRoundInfoFixture = {
  roundNumber: 3,
  startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2026-09-30T23:59:59.999Z',
  percentComplete: 100,
  daysRemaining: 0,
  poolSizeEns: '5000.000000000000000000',
  tierIndex: 0,
  vpGrowthPct: '-0.03',
} as unknown as RoundInfoResponse

export const endedTierProgressionFixture: TierProgressionResponse = {
  ...roundsFixture,
  currentTotalVP: null,
  previousTotalVP: null,
  currentGrowthBps: null,
  currentGrowthPct: null,
  currentTierIndex: null,
  activeVoterCount: null,
  maxTokenHolderAprPct: null,
  programEnded: true,
  tiers: roundsFixture.tiers.map((t) => ({
    ...t,
    isCurrent: false,
    isUnlocked: false,
    additionalVPNeeded: null,
    requiredTotalVP: null,
    estimatedAprPct: null,
  })),
}

/** Older backend: still flags October's projected Tier #1 as current. */
export const legacyEndedTierProgressionFixture = (() => {
  const { programEnded: _omit, ...rest } = roundsFixture
  return {
    ...rest,
    currentGrowthPct: '-0.03',
    currentTierIndex: 0,
    tiers: rest.tiers.map((t) => ({ ...t, isCurrent: t.index === 0, isUnlocked: t.index === 0 })),
  } as unknown as TierProgressionResponse
})()

export const endedAprFixture: AprEstimateResponse = {
  ...aprFixture,
  poolSizeEns: null,
  estimatedMonthlyRewardEns: null,
  estimatedAprPct: null,
  userShareWei: null,
  totalShareWei: null,
  qualifiesForLottery: null,
  programEnded: true,
}

export const legacyEndedAprFixture = (() => {
  const { programEnded: _omit, ...rest } = aprFixture
  return rest as unknown as AprEstimateResponse
})()

function addressRound(
  round: RoundSummary,
  rewardStatus: 'paid' | 'not_eligible',
  totalEns: string,
): AddressDistributionHistoryResponse['rounds'][number] {
  return {
    roundNumber: round.roundNumber,
    month: round.month,
    startDate: round.startDate,
    endDate: round.endDate,
    roundStatus: round.status,
    distributionDataStatus: round.distributionDataStatus,
    rewardStatus,
    voterReward: '0',
    voterRewardEns: '0.000000000000000000',
    tokenHolderReward: '0',
    tokenHolderRewardEns: totalEns,
    lotteryReward: '0',
    lotteryRewardEns: '0.000000000000000000',
    totalReward: '0',
    totalRewardEns: totalEns,
  }
}

export const endedAddressDistributionFixture: AddressDistributionHistoryResponse = {
  address: aprFixture.address,
  rounds: [
    addressRound(endedRoundListFixture.rounds[0], 'paid', '400.000000000000000000'),
    addressRound(endedRoundListFixture.rounds[1], 'paid', '250.500000000000000000'),
    addressRound(endedRoundListFixture.rounds[2], 'not_eligible', '0.000000000000000000'),
  ],
}
