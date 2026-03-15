/** API response types matching the backend OpenAPI schema. */

export interface HealthResponse {
  status: "ok";
}

export interface StatusResponse {
  activeDelegateCount: number;
  proposalCount: number;
  cachedDistributions: string[];
}

export interface ActiveDelegatesResponse {
  count: number;
  delegates: DelegateDetail[];
}

export interface EligibilityResponse {
  address: string;
  ensName: string | null;
  isActiveDelegate: boolean;
  isDelegatorToActiveDelegate: boolean;
  eligible: boolean;
  delegatedTo: string | null;
  delegatedToEnsName: string | null;
}

export interface TierEntry {
  index: number;
  momGrowthMinPct: string;
  momGrowthMaxPct: string;
  poolSizeEns: string;
  delegateCapEns: string;
  delegatorCapEns: string;
  isCurrent: boolean;
  isUnlocked: boolean;
  additionalVPNeeded: string;
  requiredAVP: string;
  estimatedApyPct: string;
}

export interface TierProgressionResponse {
  currentAVP: string;
  previousAVP: string;
  currentGrowthBps: string;
  currentGrowthPct: string;
  currentTierIndex: number;
  activeDelegateCount: number;
  maxDelegatorApyPct: string;
  tiers: TierEntry[];
}

export interface ApyEstimateResponse {
  address: string;
  ensName: string | null;
  role: "delegate" | "delegator" | "ineligible";
  delegatedTo: string | null;
  delegatedToEnsName: string | null;
  poolSizeEns: string;
  estimatedMonthlyRewardEns: string;
  estimatedApyPct: string;
  userShareWei: string;
  totalShareWei: string;
  currentBalanceEns: string;
}

export interface Payout {
  address: string;
  ensName: string | null;
  amount: string;
  amountEns: string;
  role: "delegate" | "delegator";
}

export interface LotteryEntry {
  address: string;
  ensName: string | null;
  originalAmount: string;
  role: "delegate" | "delegator";
}

export interface LotteryPool {
  totalPrize: string;
  totalPrizeEns: string;
  winner: string;
  winnerEnsName: string | null;
  entries: LotteryEntry[];
}

export interface DistributionMetadata {
  totalDistributed: string;
  totalDistributedEns: string;
  poolTier: {
    momGrowthMinBps: string;
    momGrowthMaxBps: string;
    poolSize: string;
    delegateCap: string;
    delegatorCap: string;
  };
  momGrowthBps: string;
  activeDelegateCount: number;
  eligibleDelegatorCount: number;
  computedAt: string;
  randaoSeed: string;
}

export interface DistributionResponse {
  month: string;
  metadata: DistributionMetadata;
  directPayouts: Payout[];
  lotteryPools: LotteryPool[];
}

export interface DelegateDetail {
  address: string;
  ensName: string | null;
  votingPower: string | null;
  delegatorCount: number | null;
  activeSince: string | null;
  last10ProposalsVoted: boolean[] | null;
}

export interface ApiError {
  error: string;
}

export interface RoundInfoResponse {
  roundNumber: number;
  startDate: string;
  endDate: string;
  percentComplete: number;
  daysRemaining: number;
  poolSizeEns: string;
  tierIndex: number;
}
