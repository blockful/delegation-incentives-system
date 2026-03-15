import type {
  IncentivesDataSource,
  ProposalRepository,
  VoteRepository,
  VotingPowerRepository,
  BalanceRepository,
  DelegationRepository,
  ProtocolMappingRepository,
  WalletAliasRepository,
  BlockRepository,
  DistributionRepository,
} from "../../src/interfaces.js";
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
  wei,
} from "../../src/types.js";

/**
 * In-memory implementation of IncentivesDataSource for testing.
 * Populate with test data, then pass to the pipeline.
 */
export class InMemoryDataSource implements IncentivesDataSource {
  proposals: InMemoryProposalRepository;
  votes: InMemoryVoteRepository;
  votingPower: InMemoryVotingPowerRepository;
  balances: InMemoryBalanceRepository;
  delegations: InMemoryDelegationRepository;
  protocolMappings: InMemoryProtocolMappingRepository;
  walletAliases: InMemoryWalletAliasRepository;
  blocks: InMemoryBlockRepository;
  distributions: InMemoryDistributionRepository;

  constructor(data: {
    proposals?: Proposal[];
    votes?: Vote[];
    votingPowerSnapshots?: VotingPowerSnapshot[];
    balanceEvents?: BalanceEvent[];
    delegations?: Delegation[];
    accountBalances?: AccountBalance[];
    protocolMappings?: ProtocolMapping[];
    walletAliases?: WalletAlias[];
    randaoValues?: Map<string, bigint>;
    distributions?: Map<string, DistributionResult>;
  }) {
    this.proposals = new InMemoryProposalRepository(data.proposals ?? []);
    this.votes = new InMemoryVoteRepository(data.votes ?? []);
    this.votingPower = new InMemoryVotingPowerRepository(
      data.votingPowerSnapshots ?? [],
    );
    this.balances = new InMemoryBalanceRepository(data.balanceEvents ?? []);
    this.delegations = new InMemoryDelegationRepository(
      data.delegations ?? [],
      data.accountBalances ?? [],
    );
    this.protocolMappings = new InMemoryProtocolMappingRepository(
      data.protocolMappings ?? [],
    );
    this.walletAliases = new InMemoryWalletAliasRepository(
      data.walletAliases ?? [],
    );
    this.blocks = new InMemoryBlockRepository(
      data.randaoValues ?? new Map(),
    );
    this.distributions = new InMemoryDistributionRepository(
      data.distributions ?? new Map(),
    );
  }
}

class InMemoryProposalRepository implements ProposalRepository {
  constructor(private data: Proposal[]) {}

  async getRecentProposals(count: number): Promise<Proposal[]> {
    return [...this.data]
      .sort((a, b) => Number(b.timestamp - a.timestamp))
      .slice(0, count);
  }
}

class InMemoryVoteRepository implements VoteRepository {
  constructor(private data: Vote[]) {}

  async getVotesForProposals(proposalIds: string[]): Promise<Vote[]> {
    const ids = new Set(proposalIds);
    return this.data.filter((v) => ids.has(v.proposalId));
  }
}

class InMemoryVotingPowerRepository implements VotingPowerRepository {
  constructor(private data: VotingPowerSnapshot[]) {}

  async getVotingPowerHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<VotingPowerSnapshot[]> {
    const ids = new Set(accountIds);
    return this.data.filter(
      (s) =>
        ids.has(s.accountId) &&
        s.timestamp >= from &&
        s.timestamp <= to,
    );
  }

  async getAggregateVotingPowerAt(
    delegateIds: string[],
    at: Seconds,
  ): Promise<Wei> {
    if (delegateIds.length === 0) return wei(0n);
    const ids = new Set(delegateIds);
    const atBig = BigInt(at);

    const latestByDelegate = new Map<string, VotingPowerSnapshot>();
    for (const s of this.data) {
      if (!ids.has(s.accountId)) continue;
      if (BigInt(s.timestamp) > atBig) continue;
      const existing = latestByDelegate.get(s.accountId);
      if (!existing || s.timestamp > existing.timestamp) {
        latestByDelegate.set(s.accountId, s);
      }
    }

    let total = 0n;
    for (const snapshot of latestByDelegate.values()) {
      total += BigInt(snapshot.votingPower);
    }
    return wei(total);
  }

  async getVotingPower(accountIds: string[]): Promise<Map<string, Wei>> {
    const ids = new Set(accountIds);
    const latestByAccount = new Map<string, VotingPowerSnapshot>();
    for (const s of this.data) {
      if (!ids.has(s.accountId)) continue;
      const existing = latestByAccount.get(s.accountId);
      if (!existing || s.timestamp > existing.timestamp) {
        latestByAccount.set(s.accountId, s);
      }
    }
    const result = new Map<string, Wei>();
    for (const [id, snapshot] of latestByAccount) {
      result.set(id, snapshot.votingPower);
    }
    return result;
  }
}

class InMemoryBalanceRepository implements BalanceRepository {
  constructor(private data: BalanceEvent[]) {}

  async getBalanceHistory(
    accountIds: string[],
    from: Seconds,
    to: Seconds,
  ): Promise<BalanceEvent[]> {
    const ids = new Set(accountIds);
    return this.data.filter(
      (e) =>
        ids.has(e.accountId) &&
        e.timestamp >= from &&
        e.timestamp <= to,
    );
  }

  async getBalanceAt(accountId: string, at: Seconds): Promise<Wei> {
    const events = this.data
      .filter((e) => e.accountId === accountId && e.timestamp <= at)
      .sort((a, b) => Number(b.timestamp - a.timestamp));
    return events.length > 0 ? events[0].balance : wei(0n);
  }
}

class InMemoryDelegationRepository implements DelegationRepository {
  constructor(
    private delegationData: Delegation[],
    private balanceData: AccountBalance[],
  ) {}

  async getActiveDelegations(
    delegateIds: string[],
    at: Seconds,
  ): Promise<Delegation[]> {
    const ids = new Set(delegateIds);
    // Find the latest delegation per delegator as of `at`
    const latestByDelegator = new Map<string, Delegation>();
    for (const d of this.delegationData) {
      if (d.timestamp > at) continue;
      const existing = latestByDelegator.get(d.delegatorId);
      if (!existing || d.timestamp > existing.timestamp) {
        latestByDelegator.set(d.delegatorId, d);
      }
    }
    // Only return delegations where the latest-as-of-at delegate is an active delegate
    return Array.from(latestByDelegator.values()).filter((d) =>
      ids.has(d.delegateId),
    );
  }

  async getAccountBalances(): Promise<AccountBalance[]> {
    return this.balanceData;
  }
}

class InMemoryProtocolMappingRepository implements ProtocolMappingRepository {
  constructor(private data: ProtocolMapping[]) {}

  async getMappings(): Promise<ProtocolMapping[]> {
    return this.data;
  }
}

class InMemoryWalletAliasRepository implements WalletAliasRepository {
  constructor(private data: WalletAlias[]) {}

  async getAliases(): Promise<WalletAlias[]> {
    return this.data;
  }
}

class InMemoryBlockRepository implements BlockRepository {
  constructor(private data: Map<string, bigint>) {}

  async getRandaoForDate(date: string): Promise<bigint> {
    return this.data.get(date) ?? 0n;
  }
}

class InMemoryDistributionRepository implements DistributionRepository {
  constructor(private data: Map<string, DistributionResult>) {}

  async save(month: string, result: DistributionResult): Promise<void> {
    this.data.set(month, result);
  }

  async load(month: string): Promise<DistributionResult | null> {
    return this.data.get(month) ?? null;
  }

  async list(): Promise<string[]> {
    return Array.from(this.data.keys()).sort();
  }
}
