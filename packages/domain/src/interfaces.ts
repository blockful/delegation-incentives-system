import type {
  Address,
  BalanceEvent,
  BlockNumber,
  Delegation,
  Erc1155BalanceEvent,
  MultiDelegatePosition,
  Proposal,
  Seconds,
  VestingNftOwnership,
  VestingPlan,
  Vote,
  VotingPowerEvent,
  WalletAlias,
  Wei,
} from "./types.js";

// ──────────────────────────────────────────────────────────
// Repository interfaces — data-source contracts
// ──────────────────────────────────────────────────────────

export interface ProposalRepository {
  /**
   * Return finalized proposals whose status-changing event occurred before
   * `beforeTimestamp`, ordered by that timestamp descending, capped at `limit`.
   *
   * `beforeBlock` (optional) is used to detect implicitly defeated proposals
   * whose voting period (endBlock) has passed without an explicit status event.
   */
  getFinalizedProposals(
    beforeTimestamp: Seconds,
    limit: number,
    beforeBlock?: BlockNumber,
  ): Promise<readonly Proposal[]>;
}

export interface VoteRepository {
  /** Return all votes cast on the given proposals. */
  getVotesForProposals(
    proposalIds: readonly string[],
  ): Promise<readonly Vote[]>;
}

export interface VotingPowerRepository {
  /** All DelegateVotesChanged events for `delegate` in [from, to]. */
  getVpEventsInRange(
    delegate: Address,
    from: Seconds,
    to: Seconds,
  ): Promise<readonly VotingPowerEvent[]>;

  /** Most recent VP for `delegate` at or before `timestamp`. */
  getVpAtTimestamp(
    delegate: Address,
    timestamp: Seconds,
  ): Promise<Wei>;

  /**
   * Sum of VP across all `delegates` at or before `timestamp`.
   * Each delegate contributes their most recent DelegateVotesChanged.newBalance.
   */
  getAggregateVpAtTimestamp(
    delegates: readonly Address[],
    timestamp: Seconds,
  ): Promise<Wei>;
}

export interface BalanceRepository {
  /** All Transfer-derived balance events for `account` in [from, to]. */
  getBalanceEventsInRange(
    account: Address,
    from: Seconds,
    to: Seconds,
  ): Promise<readonly BalanceEvent[]>;

  /** Most recent balance for `account` at or before `timestamp`. */
  getBalanceAtTimestamp(
    account: Address,
    timestamp: Seconds,
  ): Promise<Wei>;
}

export interface DelegationRepository {
  /**
   * All delegations pointing to any address in `delegates` at `timestamp`.
   * Returns the delegator-side of each delegation mapping.
   */
  getDelegationsToAtTimestamp(
    delegates: readonly Address[],
    timestamp: Seconds,
  ): Promise<readonly Delegation[]>;
}

export interface MultiDelegateRepository {
  /**
   * All ERC1155 positions (balance > 0) whose delegate is in `delegates`
   * at `timestamp`.
   */
  getPositionsAtTimestamp(
    delegates: readonly Address[],
    timestamp: Seconds,
  ): Promise<readonly MultiDelegatePosition[]>;

  /** ERC1155 balance-change events for (holder, delegate) in [from, to]. */
  getErc1155BalanceEventsInRange(
    holder: Address,
    delegate: Address,
    from: Seconds,
    to: Seconds,
  ): Promise<readonly Erc1155BalanceEvent[]>;

  /** Most recent ERC1155 balance for (holder, delegate) at or before `timestamp`. */
  getErc1155BalanceAtTimestamp(
    holder: Address,
    delegate: Address,
    timestamp: Seconds,
  ): Promise<Wei>;
}

export interface VestingRepository {
  /** All known Hedgey vesting contract addresses. */
  getVestingContractAddresses(): Promise<readonly Address[]>;

  /** The NFT owner for a given planId at `timestamp`. */
  getNftOwnerAtTimestamp(
    planId: string,
    timestamp: Seconds,
  ): Promise<Address>;

  /** All vesting plans associated with the given contract addresses. */
  getPlansForContracts(
    contractAddresses: readonly Address[],
  ): Promise<readonly VestingPlan[]>;
}

export interface BlockRepository {
  /** Return the block number closest to but not after `timestamp`. */
  getBlockForTimestamp(timestamp: Seconds): Promise<BlockNumber>;

  /** Return the RANDAO value from a specific block. */
  getRandaoValue(block: BlockNumber): Promise<string>;
}

export interface WalletAliasRepository {
  /** Return all configured wallet aliases. */
  getAliases(): Promise<readonly WalletAlias[]>;
}

// ──────────────────────────────────────────────────────────
// Composite data source
// ──────────────────────────────────────────────────────────

/**
 * Aggregates every repository the incentives pipeline depends on.
 * Implementations may compose separate repository instances or provide
 * a single backing store.
 */
export interface IncentivesDataSource
  extends ProposalRepository,
    VoteRepository,
    VotingPowerRepository,
    BalanceRepository,
    DelegationRepository,
    MultiDelegateRepository,
    VestingRepository,
    BlockRepository,
    WalletAliasRepository {}
