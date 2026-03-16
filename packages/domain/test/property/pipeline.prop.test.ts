/**
 * Property-based tests for the full distribution pipeline.
 *
 * These tests run the real runDistributionPipeline with randomly generated
 * inputs and assert invariants that must hold for every valid input.
 * They complement the scenario tests (which prove exact values for hand-crafted
 * inputs) by stress-testing the emergent properties of the full system.
 *
 * Invariants tested:
 *  1. Conservation       — total distributed ≤ monthly pool
 *  2. Cap enforcement    — no payout exceeds the per-role cap
 *  3. Non-negativity     — all amounts ≥ 0
 *  4. Lottery validity   — every pool winner is one of the pool entries
 *  5. Zero-balance       — a delegator with TWB=0 receives nothing
 *  6. Inactive delegate  — a delegate voting < 7/10 proposals is excluded
 *  7. Determinism        — same inputs produce identical results
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { runDistributionPipeline } from "@/pipeline.js";
import { InMemoryDataSource } from "../doubles/InMemoryDataSource.js";
import {
  wei,
  seconds,
  ONE_ENS,
  TWB_WINDOW_SECONDS,
  ACTIVE_VOTE_THRESHOLD,
  type Proposal,
  type Vote,
  type VotingPowerSnapshot,
  type BalanceEvent,
  type Delegation,
} from "@/types.js";
import { sum } from "@/util/bigint-math.js";
import { monthStartTimestamp, monthEndTimestamp } from "@/util/time.js";

// ---------------------------------------------------------------------------
// Fixed time boundaries (use a concrete month so randaoDate is deterministic)
// ---------------------------------------------------------------------------

const MONTH = "2025-03";
const MONTH_START = monthStartTimestamp(2025, 3);
const MONTH_END = monthEndTimestamp(2025, 3);
const PREV_MONTH_END = monthEndTimestamp(2025, 2);
const WINDOW = TWB_WINDOW_SECONDS as unknown as bigint;
const TWB_WINDOW_START = seconds((MONTH_END as unknown as bigint) - WINDOW);
// randaoDate = "2025-03-31" (last UTC day of March)
const RANDAO_DATE = "2025-03-31";
const RANDAO_SEED = 12345678901234567890n;

// ---------------------------------------------------------------------------
// Fixed proposals: 10 proposals all delegates can vote on
// ---------------------------------------------------------------------------

const PROPOSALS: Proposal[] = Array.from({ length: 10 }, (_, i) => ({
  id: `prop-${i}`,
  status: "executed",
  timestamp: seconds(BigInt(1700000000 + i * 100_000)),
  endBlock: BigInt(1700000000 + i * 100_000 + 10_000),
  daoId: "ens",
}));
const PROPOSAL_IDS = PROPOSALS.map((p) => p.id);

// ---------------------------------------------------------------------------
// Helpers to build data source components from generated inputs
// ---------------------------------------------------------------------------

/** One VP snapshot per delegate, valid both at monthStart and monthEnd. */
function makeVPSnapshots(
  delegateIds: string[],
  vpsByEns: bigint[],
  at: bigint,
): VotingPowerSnapshot[] {
  return delegateIds.map((id, i) => ({
    accountId: id,
    votingPower: wei(vpsByEns[i] * ONE_ENS),
    delta: wei(0n),
    timestamp: seconds(at),
  }));
}

/** Votes: each delegate votes on the first `numVotes` proposals. */
function makeVotes(delegateIds: string[], numVotesEach: number[]): Vote[] {
  const votes: Vote[] = [];
  for (let i = 0; i < delegateIds.length; i++) {
    for (let j = 0; j < numVotesEach[i]; j++) {
      votes.push({
        voterAccountId: delegateIds[i],
        proposalId: PROPOSAL_IDS[j],
        support: 1,
        votingPower: wei(1000n * ONE_ENS),
        timestamp: seconds(BigInt(MONTH_START) - 1000n),
      });
    }
  }
  return votes;
}

/** One balance event per delegator, constant throughout the TWB window. */
function makeBalanceEvents(
  delegatorIds: string[],
  balancesByEns: bigint[],
): BalanceEvent[] {
  return delegatorIds.map((id, i) => ({
    accountId: id,
    balance: wei(balancesByEns[i] * ONE_ENS),
    delta: wei(balancesByEns[i] * ONE_ENS),
    timestamp: seconds((TWB_WINDOW_START as unknown as bigint) - 1n),
  }));
}

/** One delegation per delegator → their chosen active delegate, at monthEnd. */
function makeDelegations(
  delegatorIds: string[],
  targetDelegateIds: string[],
): Delegation[] {
  return delegatorIds.map((delegatorId, i) => ({
    delegatorId,
    delegateId: targetDelegateIds[i],
    delegatedValue: wei(0n),
    timestamp: seconds((MONTH_END as unknown as bigint) - 1n),
  }));
}

// ---------------------------------------------------------------------------
// Scenario arbitrary
//
// Generates:
//  - N active delegates (VP ≥ 1 ENS, voted on all 10 proposals)
//  - M delegators (balance 0–1000 ENS, each delegating to one active delegate)
//  - prevDelegateVPs for pool-tier calculation
// ---------------------------------------------------------------------------

const scenarioArb = fc
  .integer({ min: 1, max: 5 })
  .chain((numDelegates) =>
    fc
      .tuple(
        // current VP for each delegate (in ENS, ≥ 1)
        fc.array(fc.bigInt({ min: 1n, max: 10_000n }), {
          minLength: numDelegates,
          maxLength: numDelegates,
        }),
        // previous-month VP (0 triggers bootstrap guard → tier 0)
        fc.array(fc.bigInt({ min: 0n, max: 10_000n }), {
          minLength: numDelegates,
          maxLength: numDelegates,
        }),
        // delegators: (balance ENS, target delegate index)
        fc.array(
          fc.tuple(
            fc.bigInt({ min: 0n, max: 1_000n }),
            fc.nat({ max: numDelegates - 1 }),
          ),
          { minLength: 0, maxLength: 20 },
        ),
      )
      .map(([currentVPs, prevVPs, delegatorPairs]) => ({
        numDelegates,
        currentVPs,
        prevVPs,
        delegatorPairs,
      })),
  );

/** Build a complete InMemoryDataSource from a generated scenario. */
function buildDataSource(scenario: {
  numDelegates: number;
  currentVPs: bigint[];
  prevVPs: bigint[];
  delegatorPairs: Array<[bigint, number]>;
}) {
  const { numDelegates, currentVPs, prevVPs, delegatorPairs } = scenario;

  // Unique IDs (no collisions guaranteed by index)
  const delegateIds = Array.from({ length: numDelegates }, (_, i) => `del-${i}`);
  const delegatorIds = delegatorPairs.map((_, i) => `dtor-${i}`);

  const votes = makeVotes(
    delegateIds,
    Array(numDelegates).fill(PROPOSAL_IDS.length),
  );

  const vpCurrent = makeVPSnapshots(
    delegateIds,
    currentVPs,
    MONTH_END as unknown as bigint,
  );
  const vpPrev = makeVPSnapshots(
    delegateIds,
    prevVPs,
    PREV_MONTH_END as unknown as bigint,
  );
  // Also provide VP at monthStart so TWAP calc has a basis
  const vpMonthStart = makeVPSnapshots(
    delegateIds,
    currentVPs,
    MONTH_START as unknown as bigint,
  );

  const balances = makeBalanceEvents(
    delegatorIds,
    delegatorPairs.map(([bal]) => bal),
  );

  const delegations = makeDelegations(
    delegatorIds,
    delegatorPairs.map(([, idx]) => delegateIds[idx]),
  );

  return new InMemoryDataSource({
    proposals: PROPOSALS,
    votes,
    votingPowerSnapshots: [...vpPrev, ...vpMonthStart, ...vpCurrent],
    balanceEvents: balances,
    delegations,
    randaoValues: new Map([[RANDAO_DATE, RANDAO_SEED]]),
  });
}

// ---------------------------------------------------------------------------
// Helper: run the pipeline from a scenario
// ---------------------------------------------------------------------------

async function runScenario(scenario: Parameters<typeof buildDataSource>[0]) {
  const dataSource = buildDataSource(scenario);
  return runDistributionPipeline({ month: MONTH, dataSource });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("pipeline property tests", () => {
  it("conservation: total distributed ≤ monthly pool", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        const totalDirect = sum(result.directPayouts.map((p) => p.amount as bigint));
        const totalLottery = sum(result.lotteryPools.map((p) => p.totalPrize as bigint));
        const total = totalDirect + totalLottery;
        expect(total).toBeLessThanOrEqual(result.metadata.poolTier.poolSize as unknown as bigint);
      }),
      { numRuns: 200 },
    );
  });

  it("cap enforcement: no direct payout exceeds its role cap", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        const { delegateCap, delegatorCap } = result.metadata.poolTier;
        for (const p of result.directPayouts) {
          if (p.role === "delegate") {
            expect(p.amount as unknown as bigint).toBeLessThanOrEqual(
              delegateCap as unknown as bigint,
            );
          } else {
            expect(p.amount as unknown as bigint).toBeLessThanOrEqual(
              delegatorCap as unknown as bigint,
            );
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("non-negativity: all amounts ≥ 0", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        for (const p of result.directPayouts) {
          expect(p.amount as unknown as bigint).toBeGreaterThanOrEqual(0n);
        }
        for (const pool of result.lotteryPools) {
          expect(pool.totalPrize as unknown as bigint).toBeGreaterThanOrEqual(0n);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("lottery validity: every pool winner is one of the pool entries", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        for (const pool of result.lotteryPools) {
          const entryAddresses = new Set(pool.entries.map((e) => e.address));
          expect(entryAddresses.has(pool.winner)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });

  it("determinism: same inputs produce identical results", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const [r1, r2] = await Promise.all([runScenario(scenario), runScenario(scenario)]);
        // Compare structurally (strip computedAt which is a live timestamp)
        expect(r1.directPayouts).toEqual(r2.directPayouts);
        expect(r1.lotteryPools).toEqual(r2.lotteryPools);
        expect(r1.metadata.poolTier).toEqual(r2.metadata.poolTier);
        expect(r1.metadata.totalDistributed).toEqual(r2.metadata.totalDistributed);
      }),
      { numRuns: 100 },
    );
  });

  it("zero-balance delegator receives nothing", async () => {
    await fc.assert(
      fc.asyncProperty(
        // At least one delegator has balance = 0
        fc.integer({ min: 1, max: 5 }).chain((numDelegates) =>
          fc
            .tuple(
              fc.array(fc.bigInt({ min: 1n, max: 10_000n }), {
                minLength: numDelegates,
                maxLength: numDelegates,
              }),
              fc.array(fc.bigInt({ min: 0n, max: 10_000n }), {
                minLength: numDelegates,
                maxLength: numDelegates,
              }),
              // at least 1 delegator with balance = 0
              fc.array(
                fc.tuple(fc.bigInt({ min: 1n, max: 1_000n }), fc.nat({ max: numDelegates - 1 })),
                { minLength: 0, maxLength: 10 },
              ),
              fc.nat({ max: numDelegates - 1 }), // zero-balance delegator's delegate
            )
            .map(([currentVPs, prevVPs, otherDelegators, zeroDelegateIdx]) => ({
              numDelegates,
              currentVPs,
              prevVPs,
              delegatorPairs: [
                ...otherDelegators,
                [0n, zeroDelegateIdx] as [bigint, number],
              ],
              zeroDelegatorId: `dtor-${otherDelegators.length}`,
            })),
        ),
        async (scenario) => {
          const { zeroDelegatorId, ...rest } = scenario;
          const result = await runScenario(rest);
          const zeroInDirect = result.directPayouts.some((p) => p.address === zeroDelegatorId);
          const zeroInLottery = result.lotteryPools.some((pool) =>
            pool.entries.some((e) => e.address === zeroDelegatorId),
          );
          expect(zeroInDirect).toBe(false);
          expect(zeroInLottery).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("inactive delegate (< 7 votes) receives no delegate reward", async () => {
    // 1 active delegate (10 votes) + 1 inactive delegate (< 7 votes)
    // The inactive delegate must not appear in payouts with role="delegate"
    await fc.assert(
      fc.asyncProperty(
        fc.tuple(
          fc.bigInt({ min: 1n, max: 10_000n }),  // active delegate VP
          fc.bigInt({ min: 1n, max: 10_000n }),  // inactive delegate VP
          fc.integer({ min: 0, max: ACTIVE_VOTE_THRESHOLD - 1 }), // votes < 7
        ),
        async ([activeVP, inactiveVP, inactiveVotes]) => {
          const delegateIds = ["active-del", "inactive-del"];
          const vpSnapshots: VotingPowerSnapshot[] = [
            ...makeVPSnapshots(
              delegateIds,
              [activeVP, inactiveVP],
              MONTH_END as unknown as bigint,
            ),
            ...makeVPSnapshots(
              delegateIds,
              [0n, 0n], // bootstrap: tier 0
              PREV_MONTH_END as unknown as bigint,
            ),
            ...makeVPSnapshots(
              delegateIds,
              [activeVP, inactiveVP],
              MONTH_START as unknown as bigint,
            ),
          ];

          const votes: Vote[] = [
            // active delegate: all 10 proposals
            ...PROPOSAL_IDS.map((pid) => ({
              voterAccountId: "active-del",
              proposalId: pid,
              support: 1,
              votingPower: wei(1000n * ONE_ENS),
              timestamp: seconds(BigInt(MONTH_START) - 1000n),
            })),
            // inactive delegate: only inactiveVotes proposals
            ...PROPOSAL_IDS.slice(0, inactiveVotes).map((pid) => ({
              voterAccountId: "inactive-del",
              proposalId: pid,
              support: 1,
              votingPower: wei(1000n * ONE_ENS),
              timestamp: seconds(BigInt(MONTH_START) - 1000n),
            })),
          ];

          const ds = new InMemoryDataSource({
            proposals: PROPOSALS,
            votes,
            votingPowerSnapshots: vpSnapshots,
            balanceEvents: [],
            delegations: [],
            randaoValues: new Map([[RANDAO_DATE, RANDAO_SEED]]),
          });

          const result = await runDistributionPipeline({ month: MONTH, dataSource: ds });

          const inactiveDelegatePayout = result.directPayouts.find(
            (p) => p.address === "inactive-del" && p.role === "delegate",
          );
          expect(inactiveDelegatePayout).toBeUndefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it("no address appears more than once per role in directPayouts", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        const delegateAddresses = result.directPayouts
          .filter((p) => p.role === "delegate")
          .map((p) => p.address);
        const delegatorAddresses = result.directPayouts
          .filter((p) => p.role === "delegator")
          .map((p) => p.address);
        // Each address should appear at most once per role
        expect(delegateAddresses.length).toBe(new Set(delegateAddresses).size);
        expect(delegatorAddresses.length).toBe(new Set(delegatorAddresses).size);
      }),
      { numRuns: 200 },
    );
  });

  it("metadata counts match actual payout sets", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        // activeDelegateCount ≤ numDelegates (some may vote exactly threshold)
        expect(result.metadata.activeDelegateCount).toBeGreaterThanOrEqual(0);
        expect(result.metadata.activeDelegateCount).toBeLessThanOrEqual(
          scenario.numDelegates,
        );
        // eligibleDelegatorCount ≤ number of delegators in scenario
        expect(result.metadata.eligibleDelegatorCount).toBeGreaterThanOrEqual(0);
        expect(result.metadata.eligibleDelegatorCount).toBeLessThanOrEqual(
          scenario.delegatorPairs.length,
        );
      }),
      { numRuns: 200 },
    );
  });

  it("metadata.totalDistributed matches actual sum of all payouts", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        const totalDirect = sum(result.directPayouts.map((p) => p.amount as bigint));
        const totalLottery = sum(result.lotteryPools.map((p) => p.totalPrize as bigint));
        const actualTotal = totalDirect + totalLottery;
        expect(result.metadata.totalDistributed as unknown as bigint).toBe(actualTotal);
      }),
      { numRuns: 200 },
    );
  });

  it("no entry appears in both directPayouts and lotteryPools", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        for (const pool of result.lotteryPools) {
          for (const entry of pool.entries) {
            const inDirect = result.directPayouts.some(
              (p) => p.address === entry.address && p.role === entry.role,
            );
            expect(inDirect).toBe(false);
          }
        }
      }),
      { numRuns: 200 },
    );
  });

  it("role correctness: delegates get 'delegate', delegators get 'delegator'", async () => {
    await fc.assert(
      fc.asyncProperty(scenarioArb, async (scenario) => {
        const result = await runScenario(scenario);
        const delegateIds = new Set(
          Array.from({ length: scenario.numDelegates }, (_, i) => `del-${i}`),
        );
        const delegatorIds = new Set(
          scenario.delegatorPairs.map((_, i) => `dtor-${i}`),
        );

        for (const p of result.directPayouts) {
          if (delegateIds.has(p.address)) {
            expect(p.role).toBe("delegate");
          }
          if (delegatorIds.has(p.address)) {
            expect(p.role).toBe("delegator");
          }
        }

        for (const pool of result.lotteryPools) {
          for (const entry of pool.entries) {
            if (delegateIds.has(entry.address)) {
              expect(entry.role).toBe("delegate");
            }
            if (delegatorIds.has(entry.address)) {
              expect(entry.role).toBe("delegator");
            }
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});
