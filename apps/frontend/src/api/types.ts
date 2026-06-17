/**
 * API response types derived from the backend OpenAPI schema.
 * Regenerate via `pnpm --filter @ens-dis/frontend codegen` after backend schema changes.
 */
import type { paths } from "./schema.gen";

type GetJson<P extends keyof paths, S extends number = 200> =
  paths[P] extends { get: { responses: infer R } }
    ? R extends Record<S, { content: { "application/json": infer J } }>
      ? J
      : never
    : never;

// /health is reserved by Ponder and not declared in our OpenAPI spec.
export interface HealthResponse {
  status: "ok";
}
export type StatusResponse = GetJson<"/stats">;
export type ActiveVotersResponse = GetJson<"/voters/active">;
export type EligibilityResponse = GetJson<"/eligibility/{address}">;
export type TierProgressionResponse = GetJson<"/tiers/progression">;
export type AprEstimateResponse = GetJson<"/apr/{address}">;
export type RoundInfoResponse = GetJson<"/rounds/current">;

// --- Matchmaking (selections) ---
export type WordPoolResponse = GetJson<"/selections/word-pool">;
export type SelectionResponse = GetJson<"/selections/{address}">;
export type MatchCountResponse = GetJson<"/selections/{address}/match-count">;
export type PoolWord = WordPoolResponse["pool"][number];

// Direct indexed access (not conditional infer): openapi-typescript marks
// `requestBody` optional, so a conditional `extends { requestBody: ... }` would
// resolve to `never`. NonNullable strips the `| undefined`.
export type PutSelectionBody = NonNullable<
  paths["/selections/{address}"]["put"]["requestBody"]
>["content"]["application/json"];

export type PutSelectionResponse =
  paths["/selections/{address}"]["put"]["responses"][200]["content"]["application/json"];

export type VoterDetail = ActiveVotersResponse["voters"][number];
export type TierEntry = TierProgressionResponse["tiers"][number];

/**
 * Distribution endpoint returns an opaque object in the schema (passthrough),
 * so we keep the curated response shape declared here.
 */
export interface Payout {
  address: string;
  ensName: string | null;
  amount: string;
  amountEns: string;
  role: "voter" | "token_holder";
}

export interface LotteryEntry {
  address: string;
  ensName: string | null;
  originalAmount: string;
  role: "voter" | "token_holder";
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
    voterCap: string;
    tokenHolderCap: string;
  };
  momGrowthBps: string;
  activeVoterCount: number;
  eligibleTokenHolderCount: number;
  computedAt: string;
  randaoSeed: string;
}

export interface DistributionResponse {
  month: string;
  metadata: DistributionMetadata;
  directPayouts: Payout[];
  lotteryPools: LotteryPool[];
}

export type RoundStatus = 'live' | 'ended' | 'pending' | 'paid'
export type DistributionDataStatus = 'available' | 'in_progress' | 'missing' | 'not_started'
export type RewardStatus = 'paid' | 'no_reward' | 'not_eligible' | 'pending' | 'unavailable'

export interface RoundSummary {
  roundNumber: number
  month: string
  startDate: string
  endDate: string
  status: RoundStatus
  distributionDataStatus: DistributionDataStatus
  isCurrent: boolean
  percentComplete: number | null
  daysRemaining: number | null
  tierIndex: number | null
  tierLabel: string | null
  vpGrowthPct: string | null
  poolSize: string | null
  poolSizeEns: string | null
  totalDistributed: string | null
  totalDistributedEns: string | null
  activeVoterCount: number | null
  eligibleTokenHolderCount: number | null
  lotteryBucketCount: number | null
  lotteryEntryCount: number | null
  lotteryParticipantCount: number | null
  lotteryWinnerCount: number | null
  lotteryPrize: string | null
  lotteryPrizeEns: string | null
  computedAt: string | null
}

export interface RoundListResponse {
  currentRoundNumber: number | null
  rounds: RoundSummary[]
}

export interface RewardRank {
  rank: number
  address: string
  ensName: string | null
  role: 'voter' | 'token_holder'
  reward: string
  rewardEns: string
  source: 'direct' | 'lottery' | 'combined'
  votingPower: string | null
  /**
   * Time-weighted ENS balance backing the token-holder reward, in Wei. Null
   * for voter rows and for historic rounds computed before this field was
   * persisted.
   */
  tokenHolderBalance: string | null
  delegationCount: number | null
}

export interface AddressRoundReward {
  address: string
  rewardStatus: RewardStatus
  voterReward: string
  voterRewardEns: string
  tokenHolderReward: string
  tokenHolderRewardEns: string
  lotteryReward: string
  lotteryRewardEns: string
  totalReward: string
  totalRewardEns: string
}

export interface LotteryEntryDetail {
  bucketIndex: number
  entryIndex: number
  address: string
  ensName: string | null
  amount: string
  amountEns: string
  probability: string
}

export interface LotteryBucketDetail {
  bucketIndex: number
  prize: string
  prizeEns: string
  winner: string
  winnerEnsName: string | null
  winnerProbability: string | null
  entryCount: number
  entries: LotteryEntryDetail[]
}

export interface LotteryDetail {
  seed: {
    source: 'ethereum_prev_randao'
    label: string
    value: string
    blockNumber: string
    algorithm: string
  }
  bucketTarget: string
  bucketTargetEns: string
  totalPrize: string
  totalPrizeEns: string
  bucketCount: number
  entryCount: number
  participantCount: number
  winnerCount: number
  buckets: LotteryBucketDetail[]
}

export interface RoundDetailResponse extends RoundSummary {
  addressReward: AddressRoundReward | null
  topVoterRewards: RewardRank[]
  topTokenHolderRewards: RewardRank[]
  lottery: LotteryDetail | null
}

export interface AddressDistributionRound {
  roundNumber: number
  month: string
  startDate: string
  endDate: string
  roundStatus: RoundStatus
  distributionDataStatus: DistributionDataStatus
  rewardStatus: RewardStatus
  voterReward: string
  voterRewardEns: string
  tokenHolderReward: string
  tokenHolderRewardEns: string
  lotteryReward: string
  lotteryRewardEns: string
  totalReward: string
  totalRewardEns: string
}

export interface AddressDistributionHistoryResponse {
  address: string
  rounds: AddressDistributionRound[]
}

export interface ApiError {
  error: string;
}
