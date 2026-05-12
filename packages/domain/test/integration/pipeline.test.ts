import { describe, it, expect } from "vitest";
import { runDistributionPipeline } from "../../src/pipeline.js";
import type { IncentivesDataSource } from "../../src/interfaces.js";
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
} from "../../src/types.js";
import { blockNumber, seconds, wei } from "../../src/types.js";
import { MIN_PAYOUT } from "../../src/config.js";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

const ENS = 10n ** 18n;
const MONTH = "2025-06";

// June 2025: starts 2025-06-01 00:00:00 UTC, ends 2025-06-30 23:59:59 UTC
const MONTH_START = seconds(BigInt(Date.UTC(2025, 5, 1) / 1000));
const MONTH_END = seconds(BigInt(Date.UTC(2025, 5, 30, 23, 59, 59) / 1000));

const RANDAO =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

// ─────────────────────────────────────────────────────────────
// Addresses
// ─────────────────────────────────────────────────────────────

const delegate1: Address = "0xD100000000000000000000000000000000000001";
const delegate2: Address = "0xD200000000000000000000000000000000000002";
const delegate3: Address = "0xD300000000000000000000000000000000000003";
const inactiveDelegate1: Address = "0xD400000000000000000000000000000000000004";
const inactiveDelegate2: Address = "0xD500000000000000000000000000000000000005";

// Direct delegators
const directDelegator1: Address = "0xA100000000000000000000000000000000000001";
const directDelegator2: Address = "0xA200000000000000000000000000000000000002";
const directDelegator3: Address = "0xA300000000000000000000000000000000000003";
const directDelegator4: Address = "0xA400000000000000000000000000000000000004";
const directDelegator5: Address = "0xA500000000000000000000000000000000000005";

// MultiDelegate holders
const multiHolder1: Address = "0xB100000000000000000000000000000000000001";
const multiHolder2: Address = "0xB200000000000000000000000000000000000002";

// Hedgey
const vestingContract1: Address = "0xC100000000000000000000000000000000000001";
const hedgeyBeneficiary: Address = "0xC200000000000000000000000000000000000002";

// Wallet alias: directDelegator5 is a secondary of directDelegator4
const aliasPrimary = directDelegator4;
const aliasSecondary = directDelegator5;

// ─────────────────────────────────────────────────────────────
// Proposals (10 finalized)
// ─────────────────────────────────────────────────────────────

function makeProposal(
  id: string,
  finalizedTs: bigint,
): Proposal {
  return {
    id,
    status: "executed",
    finalizedTimestamp: seconds(finalizedTs),
    startBlock: blockNumber(100n),
    endBlock: blockNumber(200n),
  };
}

// All 10 proposals finalized before MONTH_END
const PROPOSAL_BASE_TS = (MONTH_END as bigint) - 1_000_000n;
const proposals: Proposal[] = Array.from({ length: 10 }, (_, i) =>
  makeProposal(`prop-${i}`, PROPOSAL_BASE_TS + BigInt(i) * 100n),
);

// ─────────────────────────────────────────────────────────────
// Votes: 3 active delegates vote 7+ times, 2 inactive vote <7
// ─────────────────────────────────────────────────────────────

function makeVote(
  voter: Address,
  proposalId: string,
): Vote {
  return {
    voter,
    proposalId,
    support: 1,
    weight: wei(100n * ENS),
    timestamp: seconds(PROPOSAL_BASE_TS),
  };
}

const votes: Vote[] = [
  // delegate1 votes on all 10
  ...proposals.map((p) => makeVote(delegate1, p.id)),
  // delegate2 votes on first 8
  ...proposals.slice(0, 8).map((p) => makeVote(delegate2, p.id)),
  // delegate3 votes on first 7
  ...proposals.slice(0, 7).map((p) => makeVote(delegate3, p.id)),
  // inactiveDelegate1 votes on 5 (below threshold)
  ...proposals.slice(0, 5).map((p) => makeVote(inactiveDelegate1, p.id)),
  // inactiveDelegate2 votes on 3
  ...proposals.slice(0, 3).map((p) => makeVote(inactiveDelegate2, p.id)),
];

// ─────────────────────────────────────────────────────────────
// Delegations at month-end
// ─────────────────────────────────────────────────────────────

const directDelegations: Delegation[] = [
  // 5 direct delegators to active delegates
  {
    delegator: directDelegator1,
    delegate: delegate1,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  {
    delegator: directDelegator2,
    delegate: delegate1,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  {
    delegator: directDelegator3,
    delegate: delegate2,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  {
    delegator: directDelegator4,
    delegate: delegate2,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  {
    delegator: directDelegator5,
    delegate: delegate3,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  // Vesting contract delegating to delegate3
  {
    delegator: vestingContract1,
    delegate: delegate3,
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
];

// ─────────────────────────────────────────────────────────────
// MultiDelegate positions
// ─────────────────────────────────────────────────────────────

const multiPositions: MultiDelegatePosition[] = [
  {
    holder: multiHolder1,
    delegate: delegate1,
    balance: wei(500n * ENS),
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
  {
    holder: multiHolder2,
    delegate: delegate2,
    balance: wei(300n * ENS),
    timestamp: MONTH_START,
    blockNumber: blockNumber(100n),
    logIndex: 0,
  },
];

// ─────────────────────────────────────────────────────────────
// Vesting / Hedgey
// ─────────────────────────────────────────────────────────────

const vestingPlans: VestingPlan[] = [
  {
    planId: "plan-1",
    contractAddress: vestingContract1,
    token: "0x0000000000000000000000000000000000000ENS" as Address,
    amount: wei(800n * ENS),
    createdAtTimestamp: seconds((MONTH_START as bigint) - 1n),
  },
];

// ─────────────────────────────────────────────────────────────
// Wallet aliases
// ─────────────────────────────────────────────────────────────

const walletAliases: WalletAlias[] = [
  { secondary: aliasSecondary, primary: aliasPrimary },
];

// ─────────────────────────────────────────────────────────────
// VP events & balances
// ─────────────────────────────────────────────────────────────

// Each active delegate has stable VP: 1000 ENS throughout the month.
// Start-of-month aggregate: 3 * 1000 = 3000 ENS
// End-of-month aggregate: 3 * 1000 = 3000 ENS (0% growth -> tier 0)
const VP_PER_DELEGATE = 1000n * ENS;

// Direct delegators each hold 100 ENS throughout the TWB window.
// multiHolder1: 500 ENS, multiHolder2: 300 ENS
// vestingContract1: 800 ENS
// These are large enough to cross MIN_PAYOUT when multiplied by pool share.
const DIRECT_BALANCE = 100n * ENS;
const MULTI1_BALANCE = 500n * ENS;
const MULTI2_BALANCE = 300n * ENS;
const VESTING_BALANCE = 800n * ENS;

// Make directDelegator3 hold a tiny balance so its reward falls under MIN_PAYOUT
// => should go to lottery
const TINY_BALANCE = 1n; // 1 wei -- guaranteed sub-threshold

// ─────────────────────────────────────────────────────────────
// Mock IncentivesDataSource
// ─────────────────────────────────────────────────────────────

function createMockDataSource(): IncentivesDataSource {
  return {
    // ── BlockRepository ─────────────────────────────────────
    async getBlockForTimestamp(_ts: Seconds): Promise<BlockNumber> {
      return blockNumber(1_000_000n);
    },
    async getRandaoValue(_block: BlockNumber): Promise<string> {
      return RANDAO;
    },

    // ── ProposalRepository ──────────────────────────────────
    async getFinalizedProposals(
      _beforeTimestamp: Seconds,
      _limit: number,
    ): Promise<readonly Proposal[]> {
      return proposals;
    },

    // ── VoteRepository ──────────────────────────────────────
    async getVotesForProposals(
      proposalIds: readonly string[],
    ): Promise<readonly Vote[]> {
      const idSet = new Set(proposalIds);
      return votes.filter((v) => idSet.has(v.proposalId));
    },

    // ── VotingPowerRepository ───────────────────────────────
    async getVpEventsInRange(
      _delegate: Address,
      _from: Seconds,
      _to: Seconds,
    ): Promise<readonly VotingPowerEvent[]> {
      // No VP changes during the month (stable)
      return [];
    },
    async getVpAtTimestamp(
      delegate: Address,
      _timestamp: Seconds,
    ): Promise<Wei> {
      const activeDelegates = new Set([delegate1, delegate2, delegate3]);
      if (activeDelegates.has(delegate)) return wei(VP_PER_DELEGATE);
      return wei(0n);
    },
    async getAggregateVpAtTimestamp(
      delegates: readonly Address[],
      _timestamp: Seconds,
    ): Promise<Wei> {
      const activeDelegates = new Set([delegate1, delegate2, delegate3]);
      let total = 0n;
      for (const d of delegates) {
        if (activeDelegates.has(d)) total += VP_PER_DELEGATE;
      }
      return wei(total);
    },

    // ── BalanceRepository ───────────────────────────────────
    async getBalanceEventsInRange(
      _account: Address,
      _from: Seconds,
      _to: Seconds,
    ): Promise<readonly BalanceEvent[]> {
      return []; // No balance changes (stable)
    },
    async getBalanceAtTimestamp(
      account: Address,
      _timestamp: Seconds,
    ): Promise<Wei> {
      if (account === directDelegator3) return wei(TINY_BALANCE);
      if (account === vestingContract1) return wei(VESTING_BALANCE);
      // Direct delegators
      const directSet = new Set([
        directDelegator1,
        directDelegator2,
        directDelegator4,
        directDelegator5,
      ]);
      if (directSet.has(account)) return wei(DIRECT_BALANCE);
      return wei(0n);
    },

    // ── DelegationRepository ────────────────────────────────
    async getDelegationsToAtTimestamp(
      _delegates: readonly Address[],
      _timestamp: Seconds,
    ): Promise<readonly Delegation[]> {
      return directDelegations;
    },

    // ── MultiDelegateRepository ─────────────────────────────
    async getPositionsAtTimestamp(
      _delegates: readonly Address[],
      _timestamp: Seconds,
    ): Promise<readonly MultiDelegatePosition[]> {
      return multiPositions;
    },
    async getErc1155BalanceEventsInRange(
      _holder: Address,
      _delegate: Address,
      _from: Seconds,
      _to: Seconds,
    ): Promise<readonly Erc1155BalanceEvent[]> {
      return []; // No changes (stable)
    },
    async getErc1155BalanceAtTimestamp(
      holder: Address,
      _delegate: Address,
      _timestamp: Seconds,
    ): Promise<Wei> {
      if (holder === multiHolder1) return wei(MULTI1_BALANCE);
      if (holder === multiHolder2) return wei(MULTI2_BALANCE);
      return wei(0n);
    },

    // ── VestingRepository ───────────────────────────────────
    async getVestingContractAddresses(): Promise<readonly Address[]> {
      return [vestingContract1];
    },
    async getNftOwnerAtTimestamp(
      _planId: string,
      _timestamp: Seconds,
    ): Promise<Address> {
      return hedgeyBeneficiary;
    },
    async getPlansForContracts(
      _contractAddresses: readonly Address[],
    ): Promise<readonly VestingPlan[]> {
      return vestingPlans;
    },
    async getPlanBalanceEventsInRange(
      _planId: string,
      _from: Seconds,
      _to: Seconds,
    ) {
      return [];
    },
    async getPlanBalanceAtTimestamp(
      planId: string,
      _timestamp: Seconds,
    ): Promise<Wei> {
      const plan = vestingPlans.find((p) => p.planId === planId);
      return plan?.amount ?? wei(0n);
    },

    // ── WalletAliasRepository ───────────────────────────────
    async getAliases(): Promise<readonly WalletAlias[]> {
      return walletAliases;
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────

describe("runDistributionPipeline", () => {
  it("runs full pipeline and produces valid distribution result", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    // ── Metadata ──────────────────────────────────────────
    expect(result.metadata.month).toBe(MONTH);
    expect(result.metadata.monthStart).toBe(MONTH_START);
    expect(result.metadata.monthEnd).toBe(MONTH_END);
    expect(result.metadata.activeDelegateCount).toBe(3);
    expect(result.metadata.finalizedProposalIds).toHaveLength(10);

    // 0% growth -> tier 0 (pool = 5000 ENS)
    expect(result.metadata.vpGrowthPct).toBe("0.00");
    expect(result.metadata.tier).toBe(0);
    expect(result.metadata.poolSize).toBe(wei(5_000n * ENS));
  });

  it("identifies exactly 3 active delegates (voted 7+ times)", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    expect(result.metadata.activeDelegateCount).toBe(3);
  });

  it("delegate rewards + delegator rewards never exceed pool size", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    // Sum all direct payout totals
    let directTotal = 0n;
    for (const r of result.rewards) {
      directTotal += r.total as bigint;
    }

    // Sum all lottery prizes
    let lotteryTotal = 0n;
    for (const bucket of result.lottery.buckets) {
      lotteryTotal += bucket.prize as bigint;
    }

    const grandTotal = directTotal + lotteryTotal;
    const poolSize = result.metadata.poolSize as bigint;

    // Cap redistribution can leave a remainder unallocated when every
    // positive-weight recipient has reached their cap.
    expect(grandTotal).toBeGreaterThan(0n);
    expect(grandTotal).toBeLessThanOrEqual(poolSize);
  });

  it("produces lottery entries for sub-threshold participants", async () => {
    // With few delegators and a large pool, cap redistribution pushes
    // everyone above threshold. To verify the lottery path, we create a
    // scenario with many equal-weight delegators plus one tiny holder.
    // With 25+ equal-weight holders, no one hits the 5% cap, so the
    // tiny holder's pro-rata share stays near zero (sub-threshold).
    const manyDelegators: Address[] = Array.from(
      { length: 25 },
      (_, i) =>
        `0xEE${i.toString(16).padStart(38, "0")}` as Address,
    );
    const tinyDelegator: Address =
      "0xFF00000000000000000000000000000000000001";

    const manyDelegations: Delegation[] = manyDelegators.map((d) => ({
      delegator: d,
      delegate: delegate1,
      timestamp: MONTH_START,
      blockNumber: blockNumber(100n),
      logIndex: 0,
    }));
    manyDelegations.push({
      delegator: tinyDelegator,
      delegate: delegate1,
      timestamp: MONTH_START,
      blockNumber: blockNumber(100n),
      logIndex: 0,
    });

    const ds = createMockDataSource();
    // Override delegation and balance sources
    ds.getDelegationsToAtTimestamp = async () => manyDelegations;
    ds.getPositionsAtTimestamp = async () => [];
    ds.getVestingContractAddresses = async () => [];
    ds.getAliases = async () => [];
    ds.getBalanceAtTimestamp = async (account: Address) => {
      if (account === tinyDelegator) return wei(1n); // 1 wei
      if (manyDelegators.includes(account)) return wei(100n * ENS);
      // VP queries for delegates
      const activeDelegates = new Set([delegate1, delegate2, delegate3]);
      if (activeDelegates.has(account)) return wei(0n);
      return wei(0n);
    };

    const result = await runDistributionPipeline(MONTH, ds);

    // tinyDelegator should be sub-threshold and NOT in direct payouts
    const directAddresses = result.rewards.map((r) => r.address);
    expect(directAddresses).not.toContain(tinyDelegator);

    // Should have lottery buckets containing tinyDelegator
    expect(result.lottery.buckets.length).toBeGreaterThanOrEqual(1);
    const allLotteryAddresses = result.lottery.buckets.flatMap((b) =>
      b.entries.map((e) => e.address),
    );
    expect(allLotteryAddresses).toContain(tinyDelegator);

    // Each bucket has a valid winner
    for (const bucket of result.lottery.buckets) {
      expect(bucket.winner).toBeDefined();
      const bucketAddresses = bucket.entries.map((e) => e.address);
      expect(bucketAddresses).toContain(bucket.winner);
    }
  });

  it("populates deduplication log", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    // Should have multiDelegate entries
    expect(result.deduplication.multiDelegate.length).toBe(2);
    const multiHolders = result.deduplication.multiDelegate.map(
      (e) => e.erc1155Holder,
    );
    expect(multiHolders).toContain(multiHolder1);
    expect(multiHolders).toContain(multiHolder2);

    // Should have hedgey entries
    expect(result.deduplication.hedgey.length).toBe(1);
    expect(result.deduplication.hedgey[0].vestingContract).toBe(
      vestingContract1,
    );
    expect(result.deduplication.hedgey[0].nftOwner).toBe(hedgeyBeneficiary);

    // Should have wallet alias entries
    expect(result.deduplication.walletAliases.length).toBe(1);
    expect(result.deduplication.walletAliases[0].secondary).toBe(
      aliasSecondary,
    );
    expect(result.deduplication.walletAliases[0].primary).toBe(aliasPrimary);
  });

  it("consolidates aliased wallets into a single reward entry", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    // directDelegator5 (aliasSecondary) should be consolidated under
    // directDelegator4 (aliasPrimary). We should not see directDelegator5
    // as a separate reward entry.
    const allAddresses = [
      ...result.rewards.map((r) => r.address),
      ...result.lottery.buckets.flatMap((b) =>
        b.entries.map((e) => e.address),
      ),
    ];

    expect(allAddresses).not.toContain(aliasSecondary);
    // The primary should appear (either as direct payout or lottery)
    expect(allAddresses).toContain(aliasPrimary);
  });

  it("returns empty result when no active delegates", async () => {
    const ds = createMockDataSource();
    // Override to return no votes -> no active delegates
    ds.getVotesForProposals = async () => [];

    const result = await runDistributionPipeline(MONTH, ds);

    expect(result.metadata.activeDelegateCount).toBe(0);
    expect(result.rewards).toHaveLength(0);
    expect(result.lottery.buckets).toHaveLength(0);
  });

  it("all direct payouts meet minimum threshold", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    for (const r of result.rewards) {
      expect((r.total as bigint) >= (MIN_PAYOUT as bigint)).toBe(true);
    }
  });

  it("lottery bucket winners are deterministic with same RANDAO", async () => {
    const ds = createMockDataSource();
    const result1 = await runDistributionPipeline(MONTH, ds);
    const result2 = await runDistributionPipeline(MONTH, ds);

    expect(result1.lottery.buckets.length).toBe(
      result2.lottery.buckets.length,
    );
    for (let i = 0; i < result1.lottery.buckets.length; i++) {
      expect(result1.lottery.buckets[i].winner).toBe(
        result2.lottery.buckets[i].winner,
      );
    }
  });

  it("hedgey beneficiary receives rewards based on vesting plan balance", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    // hedgeyBeneficiary should appear in either rewards or lottery
    const allAddresses = [
      ...result.rewards.map((r) => r.address),
      ...result.lottery.buckets.flatMap((b) =>
        b.entries.map((e) => e.address),
      ),
    ];
    expect(allAddresses).toContain(hedgeyBeneficiary);
  });

  it("weights Hedgey beneficiaries by per-plan remainder, not full contract balance", async () => {
    const ds = createMockDataSource();
    const planOwner1: Address = "0xC300000000000000000000000000000000000003";
    const planOwner2: Address = "0xC400000000000000000000000000000000000004";
    const backgroundDelegators: Address[] = Array.from(
      { length: 20 },
      (_, i) =>
        `0xF${i.toString(16).padStart(39, "0")}` as Address,
    );

    ds.getDelegationsToAtTimestamp = async () => [
      {
        delegator: vestingContract1,
        delegate: delegate1,
        timestamp: MONTH_START,
        blockNumber: blockNumber(100n),
        logIndex: 0,
      },
      ...backgroundDelegators.map((delegator) => ({
        delegator,
        delegate: delegate1,
        timestamp: MONTH_START,
        blockNumber: blockNumber(100n),
        logIndex: 0,
      })),
    ];
    ds.getPositionsAtTimestamp = async () => [];
    ds.getAliases = async () => [];
    ds.getPlansForContracts = async () => [
      {
        planId: "plan-100",
        contractAddress: vestingContract1,
        token: "0x0000000000000000000000000000000000000ENS" as Address,
        amount: wei(100n * ENS),
        createdAtTimestamp: seconds((MONTH_START as bigint) - 1n),
      },
      {
        planId: "plan-300",
        contractAddress: vestingContract1,
        token: "0x0000000000000000000000000000000000000ENS" as Address,
        amount: wei(300n * ENS),
        createdAtTimestamp: seconds((MONTH_START as bigint) - 1n),
      },
    ];
    ds.getNftOwnerAtTimestamp = async (planId: string) =>
      planId === "plan-100" ? planOwner1 : planOwner2;
    ds.getPlanBalanceEventsInRange = async () => [];
    ds.getPlanBalanceAtTimestamp = async (planId: string) =>
      planId === "plan-100" ? wei(100n * ENS) : wei(300n * ENS);
    ds.getBalanceAtTimestamp = async (account: Address) => {
      if (backgroundDelegators.includes(account)) return wei(1000n * ENS);
      if (account === vestingContract1) return wei(1_000_000n * ENS);
      return wei(0n);
    };

    const result = await runDistributionPipeline(MONTH, ds);
    const rewardsByAddress = new Map(
      result.rewards.map((reward) => [reward.address, reward]),
    );
    const delegatorPool = 4_500n * ENS;
    const totalTwb = (20n * 1000n + 100n + 300n) * ENS;
    const expectedPlan1 = (100n * ENS * delegatorPool) / totalTwb;
    const expectedPlan2 = (300n * ENS * delegatorPool) / totalTwb;

    expect(rewardsByAddress.get(planOwner1)?.delegatorReward).toBe(
      wei(expectedPlan1),
    );
    expect(rewardsByAddress.get(planOwner2)?.delegatorReward).toBe(
      wei(expectedPlan2),
    );
  });

  it("multiDelegate holders appear in rewards or lottery", async () => {
    const ds = createMockDataSource();
    const result = await runDistributionPipeline(MONTH, ds);

    const allAddresses = [
      ...result.rewards.map((r) => r.address),
      ...result.lottery.buckets.flatMap((b) =>
        b.entries.map((e) => e.address),
      ),
    ];
    expect(allAddresses).toContain(multiHolder1);
    expect(allAddresses).toContain(multiHolder2);
  });
});
