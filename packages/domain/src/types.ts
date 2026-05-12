// ──────────────────────────────────────────────────────────
// Branded BigInt types
// ──────────────────────────────────────────────────────────

declare const __brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type Wei = Brand<bigint, "Wei">;
export type Seconds = Brand<bigint, "Seconds">;
export type WeiSeconds = Brand<bigint, "WeiSeconds">;
export type BasisPoints = Brand<bigint, "BasisPoints">;
export type BlockNumber = Brand<bigint, "BlockNumber">;

/** Constructor helpers — cast raw bigints into branded types. */
export const wei = (v: bigint): Wei => v as Wei;
export const seconds = (v: bigint): Seconds => v as Seconds;
export const weiSeconds = (v: bigint): WeiSeconds => v as WeiSeconds;
export const bps = (v: bigint): BasisPoints => v as BasisPoints;
export const blockNumber = (v: bigint): BlockNumber => v as BlockNumber;

// ──────────────────────────────────────────────────────────
// Ethereum address
// ──────────────────────────────────────────────────────────

export type Address = `0x${string}`;

// ──────────────────────────────────────────────────────────
// Proposal
// ──────────────────────────────────────────────────────────

export type ProposalStatus =
  | "pending"
  | "active"
  | "canceled"
  | "defeated"
  | "succeeded"
  | "queued"
  | "expired"
  | "executed";

/**
 * Statuses that count as finalized for the incentives pipeline.
 * Canceled proposals are excluded because they never reached a terminal
 * governance outcome after voting.
 */
export const FINALIZED_STATUSES: ReadonlySet<ProposalStatus> = new Set<ProposalStatus>([
  "executed",
  "defeated",
  "succeeded",
  "queued",
  "expired",
]);

export interface Proposal {
  readonly id: string;
  readonly status: ProposalStatus;
  /** Timestamp (seconds since epoch) when the status-changing event occurred. */
  readonly finalizedTimestamp: Seconds;
  readonly startBlock: BlockNumber;
  readonly endBlock: BlockNumber;
}

// ──────────────────────────────────────────────────────────
// Vote
// ──────────────────────────────────────────────────────────

export interface Vote {
  readonly voter: Address;
  readonly proposalId: string;
  readonly support: number;
  readonly weight: Wei;
  readonly timestamp: Seconds;
}

// ──────────────────────────────────────────────────────────
// Voting-power history (DelegateVotesChanged)
// ──────────────────────────────────────────────────────────

export interface VotingPowerEvent {
  readonly delegate: Address;
  readonly newBalance: Wei;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

// ──────────────────────────────────────────────────────────
// ENS balance history (Transfer)
// ──────────────────────────────────────────────────────────

export interface BalanceEvent {
  readonly account: Address;
  readonly balance: Wei;
  readonly delta: Wei;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

// ──────────────────────────────────────────────────────────
// Delegation (DelegateChanged)
// ──────────────────────────────────────────────────────────

export interface Delegation {
  readonly delegator: Address;
  readonly delegate: Address;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

// ──────────────────────────────────────────────────────────
// ERC20MultiDelegate (ERC1155 positions)
// ──────────────────────────────────────────────────────────

export interface MultiDelegatePosition {
  readonly holder: Address;
  readonly delegate: Address;
  readonly balance: Wei;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

export interface Erc1155BalanceEvent {
  readonly holder: Address;
  readonly delegate: Address;
  readonly balance: Wei;
  readonly delta: Wei;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

// ──────────────────────────────────────────────────────────
// Hedgey vesting
// ──────────────────────────────────────────────────────────

export interface VestingPlan {
  readonly planId: string;
  readonly contractAddress: Address;
  readonly token: Address;
  readonly amount: Wei;
  readonly createdAtTimestamp: Seconds;
}

export interface VestingNftOwnership {
  readonly planId: string;
  readonly owner: Address;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

export interface VestingBalanceEvent {
  readonly planId: string;
  readonly balance: Wei;
  readonly timestamp: Seconds;
  readonly blockNumber: BlockNumber;
  readonly logIndex: number;
}

// ──────────────────────────────────────────────────────────
// Wallet aliases
// ──────────────────────────────────────────────────────────

export interface WalletAlias {
  readonly secondary: Address;
  readonly primary: Address;
}

// ──────────────────────────────────────────────────────────
// Delegator source
// ──────────────────────────────────────────────────────────

export type DelegatorSource = "direct" | "multidelegate" | "hedgey";

// ──────────────────────────────────────────────────────────
// Pipeline domain types
// ──────────────────────────────────────────────────────────

export interface EligibleDelegator {
  readonly resolvedAddress: Address;
  readonly originalAddress: Address;
  readonly delegateAddress: Address;
  readonly source: DelegatorSource;
  readonly vestingPlanId?: string;
}

export interface ConsolidatedDelegator {
  readonly resolvedAddress: Address;
  readonly entries: readonly EligibleDelegator[];
}

export interface RewardAllocation {
  readonly address: Address;
  readonly reward: Wei;
}

export interface CombinedReward {
  readonly address: Address;
  readonly delegateReward: Wei;
  readonly delegatorReward: Wei;
  readonly total: Wei;
}

// ──────────────────────────────────────────────────────────
// Lottery
// ──────────────────────────────────────────────────────────

export interface LotteryEntry {
  readonly address: Address;
  readonly amount: Wei;
  readonly probability: string;
}

export interface LotteryBucket {
  readonly bucketIndex: number;
  readonly entries: readonly LotteryEntry[];
  readonly prize: Wei;
  readonly winner: Address;
}

// ──────────────────────────────────────────────────────────
// Pool tiers
// ──────────────────────────────────────────────────────────

export interface PoolTier {
  /** Lower bound of VP growth percentage (inclusive). */
  readonly minGrowthPct: number;
  /** Upper bound of VP growth percentage (exclusive), or `Infinity` for the last tier. */
  readonly maxGrowthPct: number;
  /** Total reward pool size in Wei. */
  readonly poolSize: Wei;
  /** Per-delegate cap = 1% of poolSize. */
  readonly delegateCap: Wei;
  /** Per-delegator cap = 5% of poolSize. */
  readonly delegatorCap: Wei;
}

// ──────────────────────────────────────────────────────────
// Round boundaries (Step 1 output)
// ──────────────────────────────────────────────────────────

export interface RoundBoundaries {
  readonly monthStart: Seconds;
  readonly monthEnd: Seconds;
  readonly startBlock: BlockNumber;
  readonly endBlock: BlockNumber;
}

// ──────────────────────────────────────────────────────────
// Distribution output
// ──────────────────────────────────────────────────────────

export interface DistributionMetadata {
  readonly month: string;
  readonly monthStart: Seconds;
  readonly monthEnd: Seconds;
  readonly startBlock: BlockNumber;
  readonly endBlock: BlockNumber;
  readonly randaoValue: string;
  readonly vpStart: Wei;
  readonly vpEnd: Wei;
  readonly vpGrowthPct: string;
  readonly tier: number;
  readonly poolSize: Wei;
  readonly delegateCap: Wei;
  readonly delegatorCap: Wei;
  readonly activeDelegateCount: number;
  readonly finalizedProposalIds: readonly string[];
}

export interface DistributionResult {
  readonly metadata: DistributionMetadata;
  readonly rewards: readonly CombinedReward[];
  readonly lottery: {
    readonly buckets: readonly LotteryBucket[];
  };
  readonly deduplication: DeduplicationLog;
}

export interface DeduplicationLog {
  readonly multiDelegate: readonly {
    readonly erc1155Holder: Address;
    readonly delegate: Address;
    readonly amount: Wei;
  }[];
  readonly hedgey: readonly {
    readonly vestingContract: Address;
    readonly nftOwner: Address;
    readonly planId: string;
  }[];
  readonly walletAliases: readonly {
    readonly secondary: Address;
    readonly primary: Address;
  }[];
}
