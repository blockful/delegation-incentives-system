import {
  type Proposal,
  type Vote,
  type VotingPowerSnapshot,
  type BalanceEvent,
  type Delegation,
  type AccountBalance,
  type ProtocolMapping,
  type WalletAlias,
  type Wei,
  type Seconds,
  type DistributionResult,
} from "./types.js";

export interface ProposalRepository {
  /** Get the N most recent on-chain proposals */
  getRecentProposals(count: number): Promise<Proposal[]>;
}

export interface VoteRepository {
  /** Get all votes for the given proposal IDs */
  getVotesForProposals(proposalIds: string[]): Promise<Vote[]>;
}

export interface VotingPowerRepository {
  /** Get voting power history for accounts within a time range */
  getVotingPowerHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<VotingPowerSnapshot[]>;

  /**
   * Get the aggregate time-weighted average voting power for the given delegates
   * over the window [from, to]. Each delegate's TWAP is computed independently
   * then summed.
   */
  getAggregateDelegatedPower(
    activeDelegateIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<Wei>;

  /** Get the current voting power for specific accounts */
  getVotingPower(accountIds: string[]): Promise<Map<string, Wei>>;
}

export interface BalanceRepository {
  /** Get balance change events for accounts within a time range */
  getBalanceHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<BalanceEvent[]>;

  /** Get the balance of an account at a specific point in time */
  getBalanceAt(accountId: string, at: Seconds): Promise<Wei>;
}

export interface DelegationRepository {
  /**
   * Get all active delegations to the given delegate IDs
   * at a specific point in time.
   */
  getActiveDelegations(
    delegateIds: string[],
    at: Seconds,
  ): Promise<Delegation[]>;

  /** Get all account balances with their delegate assignments */
  getAccountBalances(): Promise<AccountBalance[]>;
}

export interface ProtocolMappingRepository {
  /** Get known protocol mappings (vesting NFT, multi-delegate, etc.) */
  getMappings(): Promise<ProtocolMapping[]>;
}

export interface WalletAliasRepository {
  /** Get known wallet aliases (same entity, multiple addresses) */
  getAliases(): Promise<WalletAlias[]>;
}

export interface BlockRepository {
  /** Get the RANDAO value from the last block of a given date (UTC) */
  getRandaoForDate(date: string): Promise<bigint>;
}

export interface DistributionRepository {
  save(month: string, result: DistributionResult): Promise<void>;
  load(month: string): Promise<DistributionResult | null>;
  list(): Promise<string[]>;
}

/**
 * Aggregate data source interface.
 * Implementations can back this with PostgreSQL (Drizzle), GraphQL, or in-memory data.
 */
export interface IncentivesDataSource {
  proposals: ProposalRepository;
  votes: VoteRepository;
  votingPower: VotingPowerRepository;
  balances: BalanceRepository;
  delegations: DelegationRepository;
  protocolMappings: ProtocolMappingRepository;
  walletAliases: WalletAliasRepository;
  blocks: BlockRepository;
  distributions: DistributionRepository;
}
