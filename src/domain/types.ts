/**
 * Core domain types for the ENS Delegation Incentives System.
 * All monetary values use BigInt. Branded types prevent unit mixing.
 */

// --- Branded BigInt types ---

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type Wei = Brand<bigint, "Wei">;
export type Seconds = Brand<bigint, "Seconds">;
export type WeiSeconds = Brand<bigint, "WeiSeconds">;
export type BasisPoints = Brand<bigint, "BasisPoints">;

export function wei(value: bigint): Wei {
  return value as Wei;
}
export function seconds(value: bigint): Seconds {
  return value as Seconds;
}
export function weiSeconds(value: bigint): WeiSeconds {
  return value as WeiSeconds;
}
export function basisPoints(value: bigint): BasisPoints {
  return value as BasisPoints;
}

// --- Constants ---

export const ONE_ENS = wei(10n ** 18n);
export const PRECISION = 10n ** 18n;
export const SECONDS_PER_DAY = seconds(86400n);
export const DAYS_180 = 180n;
export const TWB_WINDOW_SECONDS = seconds(DAYS_180 * 86400n);
export const ACTIVE_VOTE_THRESHOLD = 7;
export const PROPOSAL_WINDOW_SIZE = 10;

// --- Domain entities ---

export interface Proposal {
  id: string;
  status: string;
  timestamp: Seconds;
  endTimestamp: Seconds;
  daoId: string;
}

export interface Vote {
  voterAccountId: string;
  proposalId: string;
  support: number;
  votingPower: Wei;
  timestamp: Seconds;
}

export interface VotingPowerSnapshot {
  accountId: string;
  votingPower: Wei;
  delta: Wei;
  timestamp: Seconds;
}

export interface BalanceEvent {
  accountId: string;
  balance: Wei;
  delta: Wei;
  timestamp: Seconds;
}

export interface Delegation {
  delegatorId: string;
  delegateId: string;
  delegatedValue: Wei;
  timestamp: Seconds;
}

export interface AccountBalance {
  accountId: string;
  balance: Wei;
  delegate: string;
}

// --- Pool tier ---

export interface PoolTier {
  momGrowthMinBps: BasisPoints; // inclusive
  momGrowthMaxBps: BasisPoints; // exclusive (use MAX_SAFE for last tier)
  poolSize: Wei;
  delegateCap: Wei;
  delegatorCap: Wei;
}

// --- Cap redistribution ---

export interface AllocationInput {
  id: string;
  weight: Wei;
}

export interface AllocationResult {
  id: string;
  amount: Wei;
}

// --- Reward computation intermediates ---

export interface DelegateScore {
  delegateId: string;
  averageVotingPower: Wei;
  proposalsVoted: number;
  isActive: boolean;
}

export interface DelegatorScore {
  delegatorId: string;
  delegateId: string;
  timeWeightedBalance: Wei;
}

// --- Protocol deduplication ---

export interface ProtocolMapping {
  /** The contract/proxy address holding tokens */
  childAddress: string;
  /** The actual owner/operator who should receive rewards */
  operatorAddress: string;
  /** Protocol name for audit trail */
  protocol: string;
}

// --- Lottery ---

export interface LotteryEntry {
  address: string;
  originalAmount: Wei;
  role: "delegate" | "delegator";
}

export interface LotteryPool {
  entries: LotteryEntry[];
  totalPrize: Wei;
  winner: string;
}

// --- Distribution output ---

export interface RewardAllocation {
  address: string;
  amount: Wei;
  role: "delegate" | "delegator";
}

export interface DistributionResult {
  month: string;
  directPayouts: RewardAllocation[];
  lotteryPools: LotteryPool[];
  metadata: DistributionMetadata;
}

export interface DistributionMetadata {
  totalDistributed: Wei;
  poolTier: PoolTier;
  momGrowthBps: BasisPoints;
  activeDelegateCount: number;
  eligibleDelegatorCount: number;
  computedAt: string;
  randaoSeed: bigint;
}
