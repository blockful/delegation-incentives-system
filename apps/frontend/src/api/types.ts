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
  delegates: string[];
}

export interface EligibilityResponse {
  address: string;
  isActiveDelegate: boolean;
  isDelegatorToActiveDelegate: boolean;
  eligible: boolean;
  delegatedTo: string | null;
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
}

export interface TierProgressionResponse {
  currentAVP: string;
  previousAVP: string;
  currentGrowthBps: string;
  currentGrowthPct: string;
  currentTierIndex: number;
  activeDelegateCount: number;
  tiers: TierEntry[];
}

export interface ApyEstimateResponse {
  address: string;
  role: "delegate" | "delegator" | "ineligible";
  delegatedTo: string | null;
  currentTierIndex: number;
  poolSizeEns: string;
  estimatedMonthlyRewardEns: string;
  estimatedApyPct: string;
  userWeight: string;
  totalPoolWeight: string;
  currentBalanceEns: string;
}

export interface Payout {
  address: string;
  amount: string;
  amountEns: string;
  role: "delegate" | "delegator";
}

export interface LotteryEntry {
  address: string;
  originalAmount: string;
  role: "delegate" | "delegator";
}

export interface LotteryPool {
  totalPrize: string;
  totalPrizeEns: string;
  winner: string;
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

export interface ComputeResultResponse {
  month: string;
  totalDistributed: string;
  activeDelegateCount: number;
  eligibleDelegatorCount: number;
  directPayoutCount: number;
  lotteryPoolCount: number;
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
