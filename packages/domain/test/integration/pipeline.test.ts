import { describe, it, expect } from "vitest";
import { runDistributionPipeline } from "@/pipeline.js";
import { InMemoryDataSource } from "@/in-memory-datasource.js";
import {
  type Proposal,
  type Vote,
  type VotingPowerSnapshot,
  type BalanceEvent,
  type Delegation,
  wei,
  seconds,
  ONE_ENS,
} from "@/types.js";
import { sum } from "@/util/bigint-math.js";
import { monthStartTimestamp, monthEndTimestamp } from "@/util/time.js";

// Test month: 2025-03
const MONTH = "2025-03";
const MONTH_START = monthStartTimestamp(2025, 3);
const MONTH_END = monthEndTimestamp(2025, 3);
const PREV_MONTH_END = monthEndTimestamp(2025, 2);
const TWB_WINDOW_START = seconds(
  (MONTH_END as bigint) - 180n * 86400n,
);
const RANDAO_SEED = 42n;

// Create 10 proposals
function makeProposals(count: number): Proposal[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `prop-${i}`,
    status: "executed",
    timestamp: seconds(BigInt(1704067200 + i * 604800)), // weekly
    endBlock: BigInt(1704067200 + i * 604800 + 604800),
    daoId: "ens",
  }));
}

// Create votes: delegate voted on specific proposals
function makeVotes(
  delegateId: string,
  proposalIds: string[],
): Vote[] {
  return proposalIds.map((pid) => ({
    voterAccountId: delegateId,
    proposalId: pid,
    support: 1,
    votingPower: wei(1000n * ONE_ENS),
    timestamp: seconds(0n),
  }));
}

// Helper to create VP snapshots
function makeVPSnapshot(
  accountId: string,
  vp: bigint,
  timestamp: bigint,
): VotingPowerSnapshot {
  return {
    accountId,
    votingPower: wei(vp * ONE_ENS),
    delta: wei(0n),
    timestamp: seconds(timestamp),
  };
}

describe("Distribution Pipeline Integration", () => {
  it("computes a basic distribution with 2 delegates and 4 delegators", async () => {
    const proposals = makeProposals(10);

    // 2 active delegates (voted 7+ of 10) and 1 inactive
    const votes = [
      ...makeVotes(
        "delegate-A",
        proposals.slice(0, 8).map((p) => p.id),
      ), // 8/10
      ...makeVotes(
        "delegate-B",
        proposals.slice(0, 7).map((p) => p.id),
      ), // 7/10
      ...makeVotes(
        "delegate-C",
        proposals.slice(0, 5).map((p) => p.id),
      ), // 5/10 - inactive
    ];

    // VP snapshots for both months (20% growth)
    const vpSnapshots: VotingPowerSnapshot[] = [
      // Previous month values
      makeVPSnapshot("delegate-A", 5000n, (PREV_MONTH_END as bigint) - 86400n),
      makeVPSnapshot("delegate-B", 5000n, (PREV_MONTH_END as bigint) - 86400n),
      // Current month values (20% growth: 12000 from 10000)
      makeVPSnapshot("delegate-A", 6000n, (MONTH_START as bigint) + 1n),
      makeVPSnapshot("delegate-B", 6000n, (MONTH_START as bigint) + 1n),
    ];

    // 4 delegators with varying balances
    const delegations: Delegation[] = [
      {
        delegatorId: "delegator-1",
        delegateId: "delegate-A",
        delegatedValue: wei(100n * ONE_ENS),
        timestamp: seconds((MONTH_START as bigint) - 86400n),
      },
      {
        delegatorId: "delegator-2",
        delegateId: "delegate-A",
        delegatedValue: wei(200n * ONE_ENS),
        timestamp: seconds((MONTH_START as bigint) - 86400n),
      },
      {
        delegatorId: "delegator-3",
        delegateId: "delegate-B",
        delegatedValue: wei(300n * ONE_ENS),
        timestamp: seconds((MONTH_START as bigint) - 86400n),
      },
      {
        delegatorId: "delegator-4",
        delegateId: "delegate-B",
        delegatedValue: wei(50n * ONE_ENS),
        timestamp: seconds((MONTH_START as bigint) - 86400n),
      },
    ];

    // Balance events: constant balances for simplicity
    const balanceEvents: BalanceEvent[] = [
      {
        accountId: "delegator-1",
        balance: wei(100n * ONE_ENS),
        delta: wei(100n * ONE_ENS),
        timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
      },
      {
        accountId: "delegator-2",
        balance: wei(200n * ONE_ENS),
        delta: wei(200n * ONE_ENS),
        timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
      },
      {
        accountId: "delegator-3",
        balance: wei(300n * ONE_ENS),
        delta: wei(300n * ONE_ENS),
        timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
      },
      {
        accountId: "delegator-4",
        balance: wei(50n * ONE_ENS),
        delta: wei(50n * ONE_ENS),
        timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
      },
    ];

    const dataSource = new InMemoryDataSource({
      proposals,
      votes,
      votingPowerSnapshots: vpSnapshots,
      balanceEvents,
      delegations,
      randaoValues: new Map([["2025-03-31", RANDAO_SEED]]),
    });

    const result = await runDistributionPipeline({
      month: MONTH,
      dataSource,
    });

    // Assertions
    expect(result.month).toBe(MONTH);
    expect(result.metadata.activeDelegateCount).toBe(2);
    expect(result.metadata.eligibleDelegatorCount).toBe(4);

    // 20% growth → 10,000 ENS pool (20-30% tier)
    expect(result.metadata.poolTier.poolSize).toBe(
      wei(10_000n * ONE_ENS),
    );

    // Total distributed should not exceed pool
    const totalDirect = sum(
      result.directPayouts.map((p) => p.amount as bigint),
    );
    const totalLottery = sum(
      result.lotteryPools.map((p) => p.totalPrize as bigint),
    );
    expect(totalDirect + totalLottery).toBeLessThanOrEqual(
      10_000n * ONE_ENS,
    );

    // Should have delegate payouts
    const delegatePayouts = result.directPayouts.filter(
      (p) => p.role === "delegate",
    );
    expect(delegatePayouts.length).toBeGreaterThan(0);

    // Should have delegator payouts
    const delegatorPayouts = result.directPayouts.filter(
      (p) => p.role === "delegator",
    );
    expect(delegatorPayouts.length).toBeGreaterThan(0);

    // No delegate exceeds cap
    for (const p of delegatePayouts) {
      expect(p.amount as bigint).toBeLessThanOrEqual(
        result.metadata.poolTier.delegateCap as bigint,
      );
    }

    // No delegator exceeds cap
    for (const p of delegatorPayouts) {
      expect(p.amount as bigint).toBeLessThanOrEqual(
        result.metadata.poolTier.delegatorCap as bigint,
      );
    }
  });

  it("is deterministic: same input produces identical output", async () => {
    const proposals = makeProposals(10);
    const votes = makeVotes(
      "delegate-A",
      proposals.slice(0, 7).map((p) => p.id),
    );
    const vpSnapshots = [
      makeVPSnapshot("delegate-A", 5000n, (PREV_MONTH_END as bigint) - 86400n),
      makeVPSnapshot("delegate-A", 6000n, (MONTH_START as bigint) + 1n),
    ];
    const delegations: Delegation[] = [
      {
        delegatorId: "delegator-1",
        delegateId: "delegate-A",
        delegatedValue: wei(100n * ONE_ENS),
        timestamp: seconds((MONTH_START as bigint) - 86400n),
      },
    ];
    const balanceEvents: BalanceEvent[] = [
      {
        accountId: "delegator-1",
        balance: wei(100n * ONE_ENS),
        delta: wei(100n * ONE_ENS),
        timestamp: seconds((TWB_WINDOW_START as bigint) - 1000n),
      },
    ];

    const makeDS = () =>
      new InMemoryDataSource({
        proposals,
        votes,
        votingPowerSnapshots: vpSnapshots,
        balanceEvents,
        delegations,
        randaoValues: new Map([["2025-03-31", RANDAO_SEED]]),
      });

    const r1 = await runDistributionPipeline({ month: MONTH, dataSource: makeDS() });
    const r2 = await runDistributionPipeline({ month: MONTH, dataSource: makeDS() });

    // Compare everything except computedAt timestamp
    expect(r1.directPayouts).toEqual(r2.directPayouts);
    expect(r1.lotteryPools).toEqual(r2.lotteryPools);
    expect(r1.metadata.totalDistributed).toEqual(r2.metadata.totalDistributed);
    expect(r1.metadata.activeDelegateCount).toEqual(
      r2.metadata.activeDelegateCount,
    );
  });

  it("returns empty result when no active delegates", async () => {
    const proposals = makeProposals(10);
    // No one voted enough
    const votes = makeVotes(
      "delegate-A",
      proposals.slice(0, 3).map((p) => p.id),
    );

    const dataSource = new InMemoryDataSource({
      proposals,
      votes,
    });

    const result = await runDistributionPipeline({
      month: MONTH,
      dataSource,
    });

    expect(result.metadata.activeDelegateCount).toBe(0);
    expect(result.directPayouts.length).toBe(0);
    expect(result.lotteryPools.length).toBe(0);
    expect(result.metadata.totalDistributed).toBe(wei(0n));
  });
});
