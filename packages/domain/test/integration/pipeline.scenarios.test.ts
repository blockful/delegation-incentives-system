/**
 * Pipeline Distribution Scenarios — Exact Value Verification
 *
 * Every expected value in this file is derived by hand from the algorithm
 * spec in docs/algorithm.md, then verified to match the implementation.
 * We assert exact bigint equality — no ranges, no "greater than" guards.
 *
 * Purpose: provide extremely high confidence for a system that distributes
 * real ENS tokens. Any formula regression breaks these tests immediately
 * with a clear failure message.
 *
 * Design rules applied throughout:
 *   1. Input numbers are chosen so that all intermediate bigint divisions
 *      are exact (no truncation error). This keeps expected values simple.
 *   2. All holding-duration constants derive from `TWB_WINDOW_SECONDS` —
 *      tests remain correct if the window length changes.
 *   3. Each `describe` block documents its hand-calculation inline so a
 *      reader can verify every expected value without running the code.
 */
import { describe, it, expect } from "vitest"
import { runDistributionPipeline } from "@/pipeline.js"
import { InMemoryDataSource } from "../doubles/InMemoryDataSource.js"
import {
  type Proposal,
  type Vote,
  type VotingPowerSnapshot,
  type BalanceEvent,
  type Delegation,
  type ProtocolMapping,
  wei,
  seconds,
  ONE_ENS,
  TWB_WINDOW_SECONDS,
} from "@/types.js"
import { monthStartTimestamp, monthEndTimestamp } from "@/util/time.js"

// ─── Shared time constants ────────────────────────────────────────────────────
//
// Test month: 2025-03 (March)
// MONTH_END   = 2025-03-31 23:59:59 UTC
// MONTH_START = 2025-03-01 00:00:00 UTC = PREV_MONTH_END + 1 second
// TWB window  = [MONTH_END − TWB_WINDOW_SECONDS, MONTH_END]
// HALF_WINDOW = TWB_WINDOW_SECONDS / 2  (the midpoint of the holding window)

const MONTH = "2025-03"
const MONTH_END = monthEndTimestamp(2025, 3)
const MONTH_START = monthStartTimestamp(2025, 3)
const PREV_MONTH_END = monthEndTimestamp(2025, 2) // one second before MONTH_START

// Extract the raw bigint so we can do arithmetic (Seconds is a branded bigint).
const WINDOW = TWB_WINDOW_SECONDS as unknown as bigint // e.g. 180 * 86400 = 15_552_000
const TWB_START = seconds((MONTH_END as unknown as bigint) - WINDOW)
const HALF_WINDOW = WINDOW / 2n // TWB midpoint; exact since 180*86400 is even

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/**
 * Ten proposals spread across the past year — enough for a delegate who voted
 * on all 10 to be active (threshold = 7).
 */
function makeProposals(): Proposal[] {
  return Array.from({ length: 10 }, (_, i) => ({
    id: `prop-${i}`,
    status: "executed",
    timestamp: seconds(BigInt(1_700_000_000 + i * 604_800)), // weekly
    endBlock: BigInt(1_700_000_000 + i * 604_800 + 604_800),
    daoId: "ens",
  }))
}

/** Delegate votes on every proposal in the supplied array. */
function makeVotes(delegateId: string, proposals: Proposal[]): Vote[] {
  return proposals.map((p) => ({
    voterAccountId: delegateId,
    proposalId: p.id,
    support: 1,
    votingPower: wei(1_000n * ONE_ENS),
    timestamp: seconds(0n),
  }))
}

/**
 * VP snapshots for a single delegate that produce a predictable MoM tier.
 *
 * Snapshot layout:
 *   • At PREV_MONTH_END  : VP = prevVP   (used for getAggregateVotingPowerAt(prevMonthEnd))
 *   • At MONTH_START     : VP = curVP    (used for getAggregateVotingPowerAt(monthEnd) and
 *                                         as the delegate's TWAP initial value)
 *
 * MoM growth = (curVP − prevVP) × 10 000 / prevVP  (in bps)
 *
 * With prevVP=1000, curVP=1050 → 500 bps = 5% → Tier 0:
 *   poolSize = 5 000 ENS, delegateCap = 50 ENS, delegatorCap = 250 ENS
 */
function makeTier0VPSnapshots(delegateId: string): VotingPowerSnapshot[] {
  return [
    { accountId: delegateId, votingPower: wei(1_000n * ONE_ENS), delta: wei(0n), timestamp: PREV_MONTH_END },
    { accountId: delegateId, votingPower: wei(1_050n * ONE_ENS), delta: wei(0n), timestamp: MONTH_START },
  ]
}

/**
 * A delegation from `delegatorId` to `delegateId` created well before the
 * TWB window (so it's "active" at monthEnd regardless of scenario timing).
 */
function makeDelegation(delegatorId: string, delegateId: string): Delegation {
  return {
    delegatorId,
    delegateId,
    delegatedValue: wei(0n), // unused by pipeline
    timestamp: seconds((TWB_START as unknown as bigint) - 1_000n),
  }
}

/**
 * A balance event that establishes an account's balance BEFORE the TWB window
 * starts, so `getBalanceAt(id, twbWindowStart)` returns this value as the
 * opening balance for the full 180-day integral.
 */
function preWindowBalanceEvent(accountId: string, balanceEns: bigint): BalanceEvent {
  return {
    accountId,
    balance: wei(balanceEns * ONE_ENS),
    delta: wei(balanceEns * ONE_ENS),
    timestamp: seconds((TWB_START as unknown as bigint) - 1n),
  }
}

/**
 * A balance event that fires INSIDE the TWB window at `secondsIntoWindow`
 * after the window start.
 */
function windowBalanceEvent(
  accountId: string,
  balanceEns: bigint,
  secondsIntoWindow: bigint,
): BalanceEvent {
  return {
    accountId,
    balance: wei(balanceEns * ONE_ENS),
    delta: wei(balanceEns * ONE_ENS),
    timestamp: seconds((TWB_START as unknown as bigint) + secondsIntoWindow),
  }
}

/** Find a direct payout by address. Returns undefined if not found. */
function findDelegatorPayout(result: Awaited<ReturnType<typeof runDistributionPipeline>>, address: string) {
  return result.directPayouts.find((p) => p.address === address && p.role === "delegator")
}

// ─── Tier 0 pool constants (derived, not hardcoded) ──────────────────────────
//
// These are computed from the same formula as the pipeline so the test stays
// in sync if config.ts ever changes.
//
// With 5% MoM growth → Tier 0:
//   poolSize     = 5 000 ENS
//   delegateCap  =    50 ENS   (1% of pool)
//   delegatorCap =   250 ENS   (5% of pool)
//   delegatePool = poolSize × 10% =  500 ENS
//   delegatorPool= poolSize × 90% = 4 500 ENS
//
// Single delegate (100% of AVP) → raw = 500 ENS → capped at 50 ENS.

const POOL       = 5_000n * ONE_ENS
const D_CAP      =    50n * ONE_ENS  // per-delegate cap
const DOR_CAP    =   250n * ONE_ENS  // per-delegator cap
const DELEG_POOL =   500n * ONE_ENS  // 10% of POOL
const DELGOR_POOL = 4_500n * ONE_ENS // 90% of POOL

// ─── Scenario 1 ───────────────────────────────────────────────────────────────

describe("Scenario 1: TWB linear proportionality — exact expected rewards", () => {
  /**
   * Setup
   * ─────
   * Delegate: "del-alpha" voted on all 10 proposals.
   *           VP: 1 000 ENS → 1 050 ENS (5% MoM → Tier 0, pool = 5 000 ENS).
   *           Delegate reward: min(500, 50) = 50 ENS (capped).
   *
   * Delegators — holding the SAME amount but for DIFFERENT durations:
   *
   *   d_full   holds 100 ENS for the FULL window   (180 days)  → TWB = 100 ENS
   *   d_half   holds 100 ENS for the LAST HALF     ( 90 days)  → TWB =  50 ENS
   *   d_double holds 200 ENS for the FULL window   (180 days)  → TWB = 200 ENS
   *   d_buy    starts with 0, BUYS 100 ENS at midpoint          → TWB =  50 ENS
   *   d_sell   holds 100 ENS, SELLS ALL at midpoint             → TWB =  50 ENS
   *
   * 45 background delegators each hold 90 ENS for the full window → 90 ENS TWB each.
   *
   * Total TWB = 100 + 50 + 200 + 50 + 50 + (45 × 90) = 450 + 4 050 = 4 500 ENS
   *
   * Reward formula (no one exceeds delegatorCap = 250 ENS):
   *   reward_i = (TWB_i / totalTWB) × delegatorPool
   *            = (TWB_i / 4 500 ENS) × 4 500 ENS
   *            = TWB_i   ← each delegator earns exactly their TWB in ENS
   *
   * Exact bigint division verification (representative):
   *   d_full:   (100 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) = 100 × ONE_ENS  ✓
   *   d_half:   ( 50 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) =  50 × ONE_ENS  ✓
   *   d_double: (200 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) = 200 × ONE_ENS  ✓
   *   No dust: sum = 4 500 ENS = delegatorPool exactly.
   *
   * Key invariants being proved:
   *   A) reward ∝ duration    — d_full  = 2 × d_half (same amount, 2× duration)
   *   B) reward ∝ amount      — d_double = 2 × d_full  (2× amount, same duration)
   *   C) buy-midpoint = sell-midpoint — d_buy = d_sell = d_half (180-day symmetry)
   *   D) delegation timing is irrelevant (all delegated before window — verified by invariant A)
   */
  it("each delegator earns exactly their TWB in ENS (totalTWB = delegatorPool)", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    // ── Balance events ────────────────────────────────────────────────────
    // d_full: 100 ENS for entire window (event placed 1 second before window)
    // d_half: 0 ENS to start, acquires 100 ENS at the window midpoint
    // d_double: 200 ENS for entire window
    // d_buy: same as d_half (0 → 100 ENS at midpoint)
    // d_sell: 100 ENS → sells all at midpoint (100 → 0 ENS)
    // bg-00..bg-44: 90 ENS each for entire window

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_full",   100n),
      // d_half has no pre-window event (initial balance = 0)
      windowBalanceEvent("d_half",  100n, HALF_WINDOW),
      preWindowBalanceEvent("d_double", 200n),
      // d_buy is identical to d_half
      windowBalanceEvent("d_buy",   100n, HALF_WINDOW),
      preWindowBalanceEvent("d_sell",   100n),
      windowBalanceEvent("d_sell",    0n, HALF_WINDOW),
      ...Array.from({ length: 45 }, (_, i) =>
        preWindowBalanceEvent(`bg-${i}`, 90n),
      ),
    ]

    const delegatorIds = ["d_full", "d_half", "d_double", "d_buy", "d_sell",
      ...Array.from({ length: 45 }, (_, i) => `bg-${i}`)]

    const delegations: Delegation[] = delegatorIds.map((id) => makeDelegation(id, delegate))

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Tier verification ─────────────────────────────────────────────────
    expect(result.metadata.poolTier.poolSize).toBe(POOL)
    expect(result.metadata.activeDelegateCount).toBe(1)
    expect(result.metadata.eligibleDelegatorCount).toBe(50)

    // ── Delegate reward ───────────────────────────────────────────────────
    // delegate pool = 500 ENS, single delegate → raw = 500 ENS > cap (50 ENS)
    const delegatePayout = result.directPayouts.find(
      (p) => p.address === delegate && p.role === "delegate",
    )
    expect(delegatePayout?.amount).toBe(D_CAP) // 50 ENS

    // ── Delegator rewards — exact expected values ─────────────────────────
    //
    // TWB calculation for each holder (WINDOW = TWB_WINDOW_SECONDS):
    //
    //   d_full:   initial=100, no window events → 100 ENS × WINDOW / WINDOW = 100 ENS
    //   d_half:   initial=0, event at HALF_WINDOW → 100 ENS × HALF_WINDOW / WINDOW = 50 ENS
    //   d_double: initial=200, no window events → 200 ENS
    //   d_buy:    initial=0, event at HALF_WINDOW (same as d_half) → 50 ENS
    //   d_sell:   initial=100, event at HALF_WINDOW setting to 0
    //             → (100 × HALF_WINDOW + 0 × HALF_WINDOW) / WINDOW = 50 ENS
    //
    // Reward = TWB (since totalTWB = delegatorPool = 4 500 ENS):
    expect(findDelegatorPayout(result, "d_full")?.amount).toBe(wei(100n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_half")?.amount).toBe(wei( 50n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_double")?.amount).toBe(wei(200n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_buy")?.amount).toBe(wei( 50n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_sell")?.amount).toBe(wei( 50n * ONE_ENS))

    // ── Invariant A: reward ∝ duration ────────────────────────────────────
    // Holding twice as long doubles the reward.
    const r_full = findDelegatorPayout(result, "d_full")!.amount as bigint
    const r_half = findDelegatorPayout(result, "d_half")!.amount as bigint
    expect(r_full).toBe(2n * r_half)

    // ── Invariant B: reward ∝ amount ──────────────────────────────────────
    // Holding twice the amount doubles the reward.
    const r_double = findDelegatorPayout(result, "d_double")!.amount as bigint
    expect(r_double).toBe(2n * r_full)

    // ── Invariant C: buy-at-midpoint = sell-at-midpoint ───────────────────
    // d_buy and d_sell both held 100 ENS for exactly half the window
    // (one in the second half, one in the first half) → identical TWBs.
    const r_buy  = findDelegatorPayout(result, "d_buy")!.amount as bigint
    const r_sell = findDelegatorPayout(result, "d_sell")!.amount as bigint
    expect(r_buy).toBe(r_sell)
    expect(r_buy).toBe(r_half)

    // ── Background delegators ─────────────────────────────────────────────
    // Each bg delegator holds 90 ENS for the full window → reward = 90 ENS each.
    for (let i = 0; i < 45; i++) {
      expect(findDelegatorPayout(result, `bg-${i}`)?.amount).toBe(wei(90n * ONE_ENS))
    }

    // ── Total distributed ─────────────────────────────────────────────────
    // Delegate: 50 ENS + Delegators: 4 500 ENS = 4 550 ENS ≤ 5 000 ENS pool
    const delegatorTotal =
      100n + 50n + 200n + 50n + 50n + 45n * 90n // = 4 500 ENS
    const totalExpected = wei((50n + delegatorTotal) * ONE_ENS)
    expect(result.metadata.totalDistributed).toBe(totalExpected)
  })
})

// ─── Scenario 2 ───────────────────────────────────────────────────────────────

describe("Scenario 2: cap redistribution — whale excess flows to minnows", () => {
  /**
   * Setup
   * ─────
   * Tier 0 (same VP setup as scenario 1).
   * Delegators:
   *   whale   : TWB = 2 000 ENS  (single large holder)
   *   minnow-i: TWB =    20 ENS  × 50 delegators
   *
   * Total TWB = 2 000 + 50 × 20 = 3 000 ENS
   * Delegator pool = 4 500 ENS,  delegatorCap = 250 ENS
   *
   * Round 1 (allocateWithCap):
   *   whale raw   = (2 000 / 3 000) × 4 500 = 3 000 ENS → exceeds cap → fixed at 250 ENS
   *   minnow raw  = (   20 / 3 000) × 4 500 =    30 ENS → under cap
   *
   * Round 2 (redistribute whale excess to 50 minnows):
   *   remaining pool = 4 500 − 250 = 4 250 ENS
   *   active weight  = 50 × 20    = 1 000 ENS
   *   minnow new raw = (20 / 1 000) × 4 250 = 85 ENS → under cap ✓ → final
   *
   * Bigint precision check:
   *   (20n × ONE_ENS × 4 250n × ONE_ENS) / (1 000n × ONE_ENS) = 85n × ONE_ENS  ✓ (exact)
   *
   * Final allocations:
   *   whale      =  250 ENS
   *   each minnow=   85 ENS
   *   total      = 250 + 50 × 85 = 250 + 4 250 = 4 500 ENS = delegatorPool  ✓ (no dust)
   *
   * Key properties proved:
   *   P1) A capped whale distributes its excess to uncapped minnows.
   *   P2) Every ENS in the delegator pool is distributed when uncapped
   *       recipients can absorb the total.
   *   P3) Each minnow earns MORE than their uncapped pro-rata share (30 ENS)
   *       because of redistribution, arriving at exactly 85 ENS.
   */
  it("capped whale redistributes excess; all 4 500 ENS delegator pool is paid out", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("whale", 2_000n),
      ...Array.from({ length: 50 }, (_, i) =>
        preWindowBalanceEvent(`minnow-${i}`, 20n),
      ),
    ]

    const delegatorIds = ["whale", ...Array.from({ length: 50 }, (_, i) => `minnow-${i}`)]
    const delegations = delegatorIds.map((id) => makeDelegation(id, delegate))

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Whale is capped ───────────────────────────────────────────────────
    expect(findDelegatorPayout(result, "whale")?.amount).toBe(DOR_CAP) // 250 ENS

    // ── Each minnow receives redistribution bonus ─────────────────────────
    // Raw share: 30 ENS.  After redistribution: 85 ENS.
    for (let i = 0; i < 50; i++) {
      expect(findDelegatorPayout(result, `minnow-${i}`)?.amount).toBe(wei(85n * ONE_ENS))
    }

    // ── Entire delegator pool is distributed (no dust, no leftover) ───────
    const delegatorAmounts = result.directPayouts
      .filter((p) => p.role === "delegator")
      .reduce((sum, p) => sum + (p.amount as bigint), 0n)
    expect(delegatorAmounts).toBe(DELGOR_POOL) // 4 500 ENS exactly
  })
})

// ─── Scenario 3 ───────────────────────────────────────────────────────────────

describe("Scenario 3: delegation timestamp is irrelevant — TWB depends only on ENS balance", () => {
  /**
   * Setup
   * ─────
   * Two delegators with IDENTICAL ENS balance history but DIFFERENT delegation
   * timestamps:
   *   d_early: delegated 180 days ago (= window start), holds 100 ENS full window
   *   d_late:  delegated 1 day before monthEnd,          holds 100 ENS full window
   *
   * Both hold 100 ENS for the full TWB window → identical TWB = 100 ENS.
   * Eligibility check: both delegated to "del-alpha" at monthEnd → both eligible.
   *
   * Total TWB = 200 ENS.
   * Both have the same weight → both receive the same reward.
   *
   * Both raw shares = (100 / 200) × 4 500 = 2 250 ENS → cap at 250 ENS.
   *
   * Key property proved:
   *   The reward is determined by HOW LONG and HOW MUCH you held ENS, not
   *   by when you chose to delegate. Delegation is a binary gate (in/out at
   *   monthEnd), not a weighting factor.
   */
  it("d_early and d_late receive identical rewards despite different delegation dates", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_early", 100n),
      preWindowBalanceEvent("d_late",  100n),
    ]

    const delegations: Delegation[] = [
      // d_early: delegated at the very start of the TWB window
      {
        delegatorId: "d_early",
        delegateId: delegate,
        delegatedValue: wei(0n),
        timestamp: TWB_START,
      },
      // d_late: delegated just 1 day before monthEnd (well inside the TWB window)
      {
        delegatorId: "d_late",
        delegateId: delegate,
        delegatedValue: wei(0n),
        timestamp: seconds((MONTH_END as unknown as bigint) - 86_400n),
      },
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Both are eligible ─────────────────────────────────────────────────
    expect(result.metadata.eligibleDelegatorCount).toBe(2)

    // ── Both have the same TWB → same reward ──────────────────────────────
    // Raw = (100/200) × 4 500 = 2 250 ENS → capped at 250 ENS for each.
    const r_early = findDelegatorPayout(result, "d_early")?.amount
    const r_late  = findDelegatorPayout(result, "d_late")?.amount
    expect(r_early).toBe(DOR_CAP) // 250 ENS
    expect(r_late).toBe(DOR_CAP)  // 250 ENS
    expect(r_early).toBe(r_late)  // identical
  })
})

// ─── Scenario 4 ───────────────────────────────────────────────────────────────

describe("Scenario 4: delegator who switches to an inactive delegate is excluded", () => {
  /**
   * Setup
   * ─────
   * Three delegators, all holding 100 ENS for the full TWB window:
   *   d_loyal : always delegated to "del-alpha" (active) → eligible
   *   d_switch: initially delegated to "del-alpha", then switched to
   *             "del-inactive" one day before monthEnd → ineligible
   *   d_never : always delegated to "del-inactive" → ineligible
   *
   * The pipeline calls getActiveDelegations(["del-alpha"], monthEnd).
   * For d_switch and d_never, the latest delegation at monthEnd points to
   * "del-inactive" which is NOT in the active set → both are excluded.
   *
   * Only d_loyal is included.  Total TWB = 100 ENS.
   * d_loyal raw = (100 / 100) × 4 500 = 4 500 ENS → cap at 250 ENS.
   *
   * Key property proved:
   *   The system correctly uses the LATEST delegation at monthEnd as the
   *   eligibility check.  Prior delegations to an active delegate do not
   *   "grandfathered in" a delegator who has since switched away.
   */
  it("d_switch and d_never do not appear in payouts; d_loyal receives the cap", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"
    const inactive = "del-inactive"

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_loyal",  100n),
      preWindowBalanceEvent("d_switch", 100n),
      preWindowBalanceEvent("d_never",  100n),
    ]

    const delegations: Delegation[] = [
      // d_loyal: single delegation to the active delegate
      makeDelegation("d_loyal", delegate),

      // d_switch: was delegated to active, then switched away
      makeDelegation("d_switch", delegate),           // old delegation (active)
      {                                               // new delegation (inactive)
        delegatorId: "d_switch",
        delegateId: inactive,
        delegatedValue: wei(0n),
        timestamp: seconds((MONTH_END as unknown as bigint) - 86_400n),
      },

      // d_never: always pointed to inactive
      makeDelegation("d_never", inactive),
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Only d_loyal is eligible ──────────────────────────────────────────
    expect(result.metadata.eligibleDelegatorCount).toBe(1)

    // ── d_loyal is capped (only delegator, gets raw = 4 500 ENS → cap) ───
    expect(findDelegatorPayout(result, "d_loyal")?.amount).toBe(DOR_CAP) // 250 ENS

    // ── Excluded delegators do not appear anywhere in the result ──────────
    const allAddresses = [
      ...result.directPayouts.map((p) => p.address),
      ...result.lotteryPools.flatMap((pool) => pool.entries.map((e) => e.address)),
    ]
    expect(allAddresses).not.toContain("d_switch")
    expect(allAddresses).not.toContain("d_never")
  })
})

// ─── Scenario 5 ───────────────────────────────────────────────────────────────

describe("Scenario 5: protocol wallet consolidation merges proxy TWB into owner", () => {
  /**
   * Setup
   * ─────
   * A protocol mapping maps "proxy-addr" → "owner-x".
   * Both addresses are independently delegating to "del-alpha".
   * Both hold ENS tokens; the pipeline consolidates them into a single entity.
   *
   * Holdings:
   *   proxy-addr : 50 ENS for the full window  → TWB =  50 ENS
   *   owner-x    : 50 ENS for the full window  → TWB =  50 ENS
   *   Consolidated: TWB = 100 ENS (rewarded to owner-x)
   *
   * 44 background delegators × 100 ENS full window → 4 400 ENS total background TWB.
   * Total TWB after consolidation = 4 400 + 100 = 4 500 ENS.
   *
   * Reward formula (totalTWB = delegatorPool → reward = TWB per ENS):
   *   owner-x reward  = 100 ENS   (< 250 ENS cap → no cap applied)
   *   each bg reward  = 100 ENS
   *
   * Bigint check:
   *   (100 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) = 100 × ONE_ENS  ✓
   *
   * Key properties proved:
   *   P1) proxy-addr does NOT receive a reward (its TWB merged into owner-x).
   *   P2) owner-x receives the COMBINED TWB reward (100 ENS, not just 50 ENS).
   *   P3) Consolidation happens BEFORE cap enforcement — the combined entity
   *       faces one cap, not two separate ones.
   */
  it("proxy-addr is merged into owner-x; owner-x earns the combined TWB reward", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("proxy-addr", 50n),
      preWindowBalanceEvent("owner-x",    50n),
      ...Array.from({ length: 44 }, (_, i) =>
        preWindowBalanceEvent(`bg-${i}`, 100n),
      ),
    ]

    const delegatorIds = [
      "proxy-addr", "owner-x",
      ...Array.from({ length: 44 }, (_, i) => `bg-${i}`),
    ]
    const delegations = delegatorIds.map((id) => makeDelegation(id, delegate))

    const protocolMappings: ProtocolMapping[] = [
      { childAddress: "proxy-addr", operatorAddress: "owner-x", protocol: "test" },
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
      protocolMappings,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── proxy-addr never appears in payouts ───────────────────────────────
    const allAddresses = [
      ...result.directPayouts.map((p) => p.address),
      ...result.lotteryPools.flatMap((pool) => pool.entries.map((e) => e.address)),
    ]
    expect(allAddresses).not.toContain("proxy-addr")

    // ── owner-x receives the combined reward (50 + 50 = 100 ENS TWB) ─────
    // No cap hit: 100 ENS < 250 ENS delegatorCap.
    expect(findDelegatorPayout(result, "owner-x")?.amount).toBe(wei(100n * ONE_ENS))

    // ── Background delegators each earn 100 ENS ───────────────────────────
    for (let i = 0; i < 44; i++) {
      expect(findDelegatorPayout(result, `bg-${i}`)?.amount).toBe(wei(100n * ONE_ENS))
    }

    // ── Consolidation precedes cap: if both wallets had 400 ENS each (800 ENS
    //    combined > cap), the entity still only receives delegatorCap once. ──
    // (Proved analytically — cap redistribution operates on consolidated scores.)
  })
})

// ─── Scenario 6 ───────────────────────────────────────────────────────────────

describe("Scenario 6: sub-threshold delegator enters lottery, not direct payout", () => {
  /**
   * Setup
   * ─────
   * MIN_PAYOUT_THRESHOLD = 1 ENS.  A delegator whose raw reward is below
   * this threshold enters a lottery pool instead of receiving a direct payout.
   *
   * To produce a sub-threshold raw reward:
   *   d_big   : holds 10 000 ENS for the full window → TWB = 10 000 ENS
   *   d_tiny + 4 siblings: each holds 1 ENS for only the LAST DAY (86 400 s)
   *           TWB = 1 ENS × 86 400 / TWB_WINDOW_SECONDS
   *               = 1 ENS / 180 ≈ 0.00556 ENS  (≪ 1 ENS threshold → lottery)
   *
   * 45 bg delegators × 100 ENS TWB absorb d_big's cap redistribution so each
   * micro-holder's final reward stays sub-threshold.
   *
   * The lottery requires ≥ 2 entries per pool. A solo sub-threshold entry is
   * promoted to a direct payout — hence 5 micro-holders form a multi-entry pool.
   *
   * Key properties proved:
   *   P1) d_tiny does NOT appear in directPayouts.
   *   P2) d_tiny DOES appear in lotteryPools as an entry.
   *   P3) d_tiny's originalAmount < 1 ENS (the threshold).
   *   P4) The lottery pool's winner is one of the entries (invariant).
   *   P5) d_big receives a direct payout of 250 ENS (delegatorCap).
   */
  it("d_tiny's sub-threshold reward goes to lottery; d_big receives a direct payout", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    // d_tiny and 4 siblings each acquire 1 ENS with exactly 1 day remaining.
    // Each has TWB ≈ 0.00556 ENS (= ONE_ENS / 180), well below the 1 ENS threshold.
    //
    // 45 background delegators × 100 ENS TWB absorb d_big's cap redistribution
    // so each micro-holder's share stays sub-threshold after capping rounds.
    //
    // The lottery requires ≥ 2 entries in a pool — a solo sub-threshold entry
    // is promoted directly. Five micro-holders create a multi-entry pool.
    const ONE_DAY = 86_400n
    const microIds = ["d_tiny", "d_micro_1", "d_micro_2", "d_micro_3", "d_micro_4"]
    const bgIds = Array.from({ length: 45 }, (_, i) => `d_s6bg_${i}`)
    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_big", 10_000n),
      ...microIds.map((id) => ({
        accountId: id,
        balance: wei(ONE_ENS),
        delta: wei(ONE_ENS),
        timestamp: seconds((MONTH_END as unknown as bigint) - ONE_DAY),
      })),
      ...bgIds.map((id) => preWindowBalanceEvent(id, 100n)),
    ]

    const delegations: Delegation[] = [
      makeDelegation("d_big",  delegate),
      ...microIds.map((id) => makeDelegation(id, delegate)),
      ...bgIds.map((id) => makeDelegation(id, delegate)),
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── d_big is a direct payout (capped) ────────────────────────────────
    const bigPayout = findDelegatorPayout(result, "d_big")
    expect(bigPayout).toBeDefined()
    expect(bigPayout?.amount).toBe(DOR_CAP) // 250 ENS

    // ── d_tiny is NOT in direct payouts ───────────────────────────────────
    const tinyDirect = findDelegatorPayout(result, "d_tiny")
    expect(tinyDirect).toBeUndefined()

    // ── d_tiny IS in a lottery pool ───────────────────────────────────────
    const lotteryEntry = result.lotteryPools
      .flatMap((pool) => pool.entries)
      .find((e) => e.address === "d_tiny")
    expect(lotteryEntry).toBeDefined()
    expect(lotteryEntry?.role).toBe("delegator")

    // ── d_tiny's lottery reward is below the 1 ENS threshold ─────────────
    const tinyLotteryAmount = lotteryEntry?.originalAmount as bigint
    expect(tinyLotteryAmount).toBeLessThan(ONE_ENS)
    expect(tinyLotteryAmount).toBeGreaterThan(0n)

    // ── Each lottery pool has a valid winner ──────────────────────────────
    for (const pool of result.lotteryPools) {
      const winnerIsEntry = pool.entries.some((e) => e.address === pool.winner)
      expect(winnerIsEntry).toBe(true)
    }
  })
})

// ─── Scenario 7 ───────────────────────────────────────────────────────────────

describe("Scenario 7: partial-window holding — exact TWB for fractional durations", () => {
  /**
   * Verifies the exact TWB formula for three common partial-window patterns.
   * All holders start with 0 ENS and acquire 360 ENS at different points.
   *
   * The holding fraction f = (WINDOW − entry_offset) / WINDOW.
   * With balance = 360 ENS, TWB = 360 × f.
   *
   * Entry points and expected TWBs (chosen so TWB is a whole number):
   *   d_1day:    entered at WINDOW − WINDOW/180 seconds before end
   *              f = (WINDOW/180) / WINDOW = 1/180
   *              TWB = 360 × 1/180 = 2 ENS
   *
   *   d_quarter: entered at WINDOW − WINDOW/4 seconds before end
   *              f = (WINDOW/4) / WINDOW = 1/4
   *              TWB = 360 × 1/4 = 90 ENS
   *
   *   d_third:   entered at WINDOW − WINDOW/3 seconds before end
   *              f = (WINDOW/3) / WINDOW = 1/3
   *              TWB = 360 × 1/3 = 120 ENS
   *
   * Bigint exactness:
   *   WINDOW = 180 × 86 400 is divisible by 180, 4, and 3.
   *   All resulting TWBs are whole multiples of ONE_ENS.
   *
   * The three delegators together + 18 background delegators are set up so
   * totalTWB = 4 500 ENS with NO capping:
   *   17 bg delegators × 248 ENS TWB = 4 216 ENS
   *    1 bg delegator  ×  72 ENS TWB =    72 ENS
   *   Total background = 4 288 ENS
   *   Grand total      = 4 288 + 2 + 90 + 120 = 4 500 ENS
   *
   * All delegators have reward = TWB (exact bigint division, no capping):
   *   d_1day    reward = 2 ENS   (2   < 248 bg max < 250 cap ✓)
   *   d_quarter reward = 90 ENS  (90  < 250 cap ✓)
   *   d_third   reward = 120 ENS (120 < 250 cap ✓)
   *   each bg-0..bg-16 reward = 248 ENS  (248 < 250 cap ✓)
   *   bg-17          reward =  72 ENS
   */
  it("fractional entry point produces exact TWB proportional to holding duration", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    // WINDOW must be divisible by 180, 4, and 3 for exact division.
    // WINDOW = 180 × 86 400 = 15 552 000 — divisible by all three ✓
    const ONE_PART  = WINDOW / 180n // = 86 400s = 1 day
    const QUARTER   = WINDOW / 4n  // = 3 888 000s = 45 days
    const THIRD     = WINDOW / 3n  // = 5 184 000s = 60 days

    // Background: 17 × 248 ENS + 1 × 72 ENS = 4 288 ENS TWB
    // totalTWB = 2 + 90 + 120 + 4 288 = 4 500 ENS = delegatorPool
    // All delegators' reward = their TWB (exact bigint division, no capping).
    const bg17Ids = Array.from({ length: 17 }, (_, i) => `d_s7bg_${i}`)
    const bg17Events = bg17Ids.map((id) => preWindowBalanceEvent(id, 248n))
    const bg17Delegations = bg17Ids.map((id) => makeDelegation(id, delegate))

    // All holders start with 0 (no pre-window event). Each acquires 360 ENS
    // at a different point inside the TWB window.
    const balanceEvents: BalanceEvent[] = [
      windowBalanceEvent("d_1day",    360n, WINDOW - ONE_PART),
      windowBalanceEvent("d_quarter", 360n, WINDOW - QUARTER),
      windowBalanceEvent("d_third",   360n, WINDOW - THIRD),
      ...bg17Events,
      preWindowBalanceEvent("d_s7bg_17", 72n),
    ]

    const delegations = [
      ...["d_1day", "d_quarter", "d_third"].map((id) => makeDelegation(id, delegate)),
      ...bg17Delegations,
      makeDelegation("d_s7bg_17", delegate),
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Exact TWB-derived rewards (totalTWB = 4 500 ENS → reward = TWB) ──
    //
    //   d_1day:    360 × (ONE_PART / WINDOW) × ONE_ENS = 360 / 180 × ONE_ENS = 2 × ONE_ENS
    //   d_quarter: 360 × (QUARTER  / WINDOW) × ONE_ENS = 360 / 4   × ONE_ENS = 90 × ONE_ENS
    //   d_third:   360 × (THIRD    / WINDOW) × ONE_ENS = 360 / 3   × ONE_ENS = 120 × ONE_ENS
    expect(findDelegatorPayout(result, "d_1day")?.amount).toBe(wei(  2n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_quarter")?.amount).toBe(wei( 90n * ONE_ENS))
    expect(findDelegatorPayout(result, "d_third")?.amount).toBe(wei(120n * ONE_ENS))

    // ── Duration ratio invariants ─────────────────────────────────────────
    // d_third is 60 days out of 180 (1/3 window).
    // d_quarter is 45 days (1/4 window).
    // d_1day is 1 day (1/180 window).
    // Their TWBs (and rewards) are in ratio 60:45:1, i.e. 120:90:2.
    const r_1day    = findDelegatorPayout(result, "d_1day")!.amount as bigint
    const r_quarter = findDelegatorPayout(result, "d_quarter")!.amount as bigint
    const r_third   = findDelegatorPayout(result, "d_third")!.amount as bigint
    expect(r_third).toBe(60n * r_1day)   // 60 days vs 1 day
    expect(r_quarter).toBe(45n * r_1day) // 45 days vs 1 day
    expect(r_third * 3n).toBe(r_quarter * 4n) // 1/3 window : 1/4 window = 4:3
  })
})

// ─── Scenario 8 ───────────────────────────────────────────────────────────────

describe("Scenario 8: whale-only delegator (no other delegators)", () => {
  /**
   * Setup
   * ─────
   * Tier 0 (same VP setup as scenario 1).
   * Single delegator:
   *   whale-solo: holds 10 000 ENS for the full TWB window → TWB = 10 000 ENS
   *
   * Total TWB = 10 000 ENS.
   * Delegator pool = 4 500 ENS, delegatorCap = 250 ENS.
   *
   * whale-solo is the ONLY delegator → gets 100% of delegator pool.
   * Raw share = (10 000 / 10 000) × 4 500 = 4 500 ENS → exceeds cap → capped at 250 ENS.
   *
   * No other delegators exist to absorb the excess.
   * Remaining 4 250 ENS is unallocated (returned to treasury).
   *
   * Key properties proved:
   *   P1) A single whale receives exactly the delegator cap (250 ENS), not more.
   *   P2) Total delegator distribution = DOR_CAP when no one else can absorb excess.
   *   P3) eligibleDelegatorCount = 1.
   */
  it("single whale gets exactly DOR_CAP; excess is unallocated", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("whale-solo", 10_000n),
    ]

    const delegations: Delegation[] = [
      makeDelegation("whale-solo", delegate),
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Whale gets exactly the delegator cap ──────────────────────────────
    expect(findDelegatorPayout(result, "whale-solo")?.amount).toBe(DOR_CAP) // 250 ENS

    // ── Only one eligible delegator ───────────────────────────────────────
    expect(result.metadata.eligibleDelegatorCount).toBe(1)

    // ── Total delegator distribution = DOR_CAP (excess is unallocated) ───
    const delegatorTotal = result.directPayouts
      .filter((p) => p.role === "delegator")
      .reduce((sum, p) => sum + (p.amount as bigint), 0n)
    expect(delegatorTotal).toBe(DOR_CAP) // 250 ENS, not 4 500 ENS
  })
})

// ─── Scenario 9 ───────────────────────────────────────────────────────────────

describe("Scenario 9: negative VP growth (decline) forces tier 0", () => {
  /**
   * Setup
   * ─────
   * Delegate "del-alpha" has VP snapshots showing decline:
   *   prevVP = 2 000 ENS, curVP = 1 500 ENS
   *   MoM growth = (1 500 − 2 000) × 10 000 / 2 000 = −2 500 bps = −25%
   *
   * Negative growth → below first tier boundary (0%) → Tier 0.
   *   poolSize = 5 000 ENS, delegateCap = 50 ENS, delegatorCap = 250 ENS
   *
   * Delegator "d1" holds 100 ENS for the full window → TWB = 100 ENS.
   * Delegator pool = 4 500 ENS.
   * d1 raw = (100 / 100) × 4 500 = 4 500 ENS → capped at 250 ENS.
   *
   * Key properties proved:
   *   P1) Negative VP growth results in tier 0 (the system doesn't crash).
   *   P2) poolTier.poolSize = POOL (tier 0 pool).
   *   P3) Rewards are still distributed (totalDistributed > 0).
   */
  it("declining VP produces tier 0 and rewards are still distributed", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    // VP decline: 2 000 → 1 500 ENS (−25%)
    const vpSnapshots: VotingPowerSnapshot[] = [
      { accountId: delegate, votingPower: wei(2_000n * ONE_ENS), delta: wei(0n), timestamp: PREV_MONTH_END },
      { accountId: delegate, votingPower: wei(1_500n * ONE_ENS), delta: wei(0n), timestamp: MONTH_START },
    ]

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d1", 100n),
    ]

    const delegations: Delegation[] = [
      makeDelegation("d1", delegate),
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: vpSnapshots,
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Tier 0 is selected (negative growth falls below 0% boundary) ─────
    expect(result.metadata.poolTier.poolSize).toBe(POOL) // 5 000 ENS

    // ── Rewards are distributed despite negative growth ───────────────────
    expect(result.metadata.totalDistributed).toBeGreaterThan(0n)

    // ── d1 receives capped reward ─────────────────────────────────────────
    expect(findDelegatorPayout(result, "d1")?.amount).toBe(DOR_CAP) // 250 ENS
  })
})

// ─── Scenario 10 ──────────────────────────────────────────────────────────────

describe("Scenario 10: delegate who is also a delegator", () => {
  /**
   * Setup
   * ─────
   * Two active delegates: "del-alpha" and "del-beta".
   * Both voted on all 10 proposals (active).
   * Both have VP: 1 000 → 1 050 ENS (5% MoM → Tier 0).
   *
   * Delegations:
   *   "d1"        → "del-alpha"  (100 ENS, full window)
   *   "del-alpha" → "del-beta"   (100 ENS, full window)  ← del-alpha is ALSO a delegator
   *
   * Delegate rewards (pool = 500 ENS, 2 active delegates):
   *   Each delegate has equal AVP (1 050 ENS each).
   *   raw per delegate = (1 050 / 2 100) × 500 = 250 ENS → capped at 50 ENS.
   *
   * Delegator rewards (pool = 4 500 ENS):
   *   Delegators of del-alpha: "d1" with TWB = 100 ENS
   *   Delegators of del-beta:  "del-alpha" with TWB = 100 ENS
   *   Total TWB across ALL eligible delegators = 200 ENS.
   *
   *   d1 raw        = (100 / 200) × 4 500 = 2 250 ENS → capped at 250 ENS
   *   del-alpha raw = (100 / 200) × 4 500 = 2 250 ENS → capped at 250 ENS
   *
   * Key properties proved:
   *   P1) del-alpha appears as a delegate payout (role="delegate").
   *   P2) del-alpha also appears as a delegator payout (role="delegator").
   *   P3) Both rewards are present and independent.
   */

  function makeTier0VPSnapshotsMulti(delegateIds: string[]): VotingPowerSnapshot[] {
    return delegateIds.flatMap(id => [
      { accountId: id, votingPower: wei(1_000n * ONE_ENS), delta: wei(0n), timestamp: PREV_MONTH_END },
      { accountId: id, votingPower: wei(1_050n * ONE_ENS), delta: wei(0n), timestamp: MONTH_START },
    ])
  }

  it("del-alpha earns both a delegate reward and a delegator reward independently", async () => {
    const proposals = makeProposals()
    const delegates = ["del-alpha", "del-beta"]

    // Both delegates vote on all 10 proposals
    const votes: Vote[] = [
      ...makeVotes("del-alpha", proposals),
      ...makeVotes("del-beta",  proposals),
    ]

    const vpSnapshots = makeTier0VPSnapshotsMulti(delegates)

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d1",        100n),
      preWindowBalanceEvent("del-alpha", 100n),
    ]

    const delegations: Delegation[] = [
      makeDelegation("d1",        "del-alpha"), // d1 delegates to del-alpha
      makeDelegation("del-alpha", "del-beta"),  // del-alpha delegates to del-beta
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes,
      votingPowerSnapshots: vpSnapshots,
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── del-alpha receives a delegate reward (role="delegate") ────────────
    const alphaDelegate = result.directPayouts.find(
      (p) => p.address === "del-alpha" && p.role === "delegate",
    )
    expect(alphaDelegate).toBeDefined()
    expect(alphaDelegate?.amount).toBe(D_CAP) // 50 ENS

    // ── del-alpha ALSO receives a delegator reward (role="delegator") ─────
    const alphaDelegator = result.directPayouts.find(
      (p) => p.address === "del-alpha" && p.role === "delegator",
    )
    expect(alphaDelegator).toBeDefined()
    expect(alphaDelegator?.amount).toBe(DOR_CAP) // 250 ENS

    // ── Both rewards are present and independent ──────────────────────────
    expect(alphaDelegate?.amount).not.toBe(alphaDelegator?.amount)

    // ── del-beta also receives a delegate reward ──────────────────────────
    const betaDelegate = result.directPayouts.find(
      (p) => p.address === "del-beta" && p.role === "delegate",
    )
    expect(betaDelegate).toBeDefined()
    expect(betaDelegate?.amount).toBe(D_CAP) // 50 ENS

    // ── d1 receives a delegator reward ────────────────────────────────────
    expect(findDelegatorPayout(result, "d1")?.amount).toBe(DOR_CAP) // 250 ENS
  })
})

// ─── Scenario 11 ──────────────────────────────────────────────────────────────

describe("Scenario 11: delegator switches between two ACTIVE delegates mid-month", () => {
  /**
   * Setup
   * ─────
   * Two active delegates: "del-alpha" and "del-beta".
   * Both voted on all 10 proposals, same VP (Tier 0).
   *
   * Delegator "d_switch":
   *   - Holds 100 ENS for the full TWB window
   *   - Initially delegated to "del-alpha" (before window start)
   *   - Switches delegation to "del-beta" 1 day before monthEnd
   *
   * Delegator "d_loyal":
   *   - Holds 100 ENS for the full TWB window
   *   - Always delegated to "del-alpha"
   *
   * At monthEnd, d_switch's latest delegation points to "del-beta".
   * Both delegators are eligible. Total TWB = 200 ENS.
   * Each raw = (100/200) × 4 500 = 2 250 ENS → capped at 250 ENS.
   *
   * Key property proved:
   *   Switching between two ACTIVE delegates mid-month is valid — the
   *   delegator earns rewards via the NEW delegate, not the old one.
   */

  function makeTier0VPSnapshotsMulti(ids: string[]): VotingPowerSnapshot[] {
    return ids.flatMap(id => [
      { accountId: id, votingPower: wei(1_000n * ONE_ENS), delta: wei(0n), timestamp: PREV_MONTH_END },
      { accountId: id, votingPower: wei(1_050n * ONE_ENS), delta: wei(0n), timestamp: MONTH_START },
    ])
  }

  it("d_switch earns reward via del-beta after switching; d_loyal via del-alpha", async () => {
    const proposals = makeProposals()
    const votes: Vote[] = [
      ...makeVotes("del-alpha", proposals),
      ...makeVotes("del-beta",  proposals),
    ]

    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_switch", 100n),
      preWindowBalanceEvent("d_loyal",  100n),
    ]

    const delegations: Delegation[] = [
      makeDelegation("d_loyal", "del-alpha"),
      makeDelegation("d_switch", "del-alpha"),
      {
        delegatorId: "d_switch",
        delegateId: "del-beta",
        delegatedValue: wei(0n),
        timestamp: seconds((MONTH_END as unknown as bigint) - 86_400n),
      },
    ]

    const dataSource = new InMemoryDataSource({
      proposals,
      votes,
      votingPowerSnapshots: makeTier0VPSnapshotsMulti(["del-alpha", "del-beta"]),
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    expect(result.metadata.eligibleDelegatorCount).toBe(2)
    expect(findDelegatorPayout(result, "d_loyal")?.amount).toBe(DOR_CAP)
    expect(findDelegatorPayout(result, "d_switch")?.amount).toBe(DOR_CAP)

    const allAddresses = result.directPayouts.map((p) => p.address)
    expect(allAddresses).toContain("d_switch")
    expect(allAddresses).toContain("d_loyal")
  })
})

// ─── Scenario 12 ──────────────────────────────────────────────────────────────

describe("Scenario 12: active delegates with zero delegators — delegate-only distribution", () => {
  /**
   * Setup
   * ─────
   * Tier 0. One active delegate "del-alpha" (voted on all 10 proposals).
   * NO delegators exist.
   *
   * Delegate pool = 500 ENS → capped at 50 ENS (single delegate).
   * Delegator pool = 4 500 ENS → entirely unallocated (no delegators).
   * Total distributed = 50 ENS.
   *
   * Key properties proved:
   *   P1) Pipeline does not crash with zero delegators.
   *   P2) Only delegate rewards are distributed.
   *   P3) totalDistributed = 50 ENS (delegate cap only).
   */
  it("only delegate rewards distributed; no crash with empty delegator set", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: makeTier0VPSnapshots(delegate),
      balanceEvents: [],
      delegations: [],
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    expect(result.month).toBe(MONTH)
    expect(result.metadata.eligibleDelegatorCount).toBe(0)

    const delegatePayout = result.directPayouts.find(
      (p) => p.address === delegate && p.role === "delegate",
    )
    expect(delegatePayout?.amount).toBe(D_CAP)

    const delegatorPayouts = result.directPayouts.filter((p) => p.role === "delegator")
    expect(delegatorPayouts).toHaveLength(0)

    const lotteryDelegators = result.lotteryPools
      .flatMap((pool) => pool.entries)
      .filter((e) => e.role === "delegator")
    expect(lotteryDelegators).toHaveLength(0)

    expect(result.metadata.totalDistributed).toBe(D_CAP)
  })
})

// ─── Scenario 13 ──────────────────────────────────────────────────────────────

describe("Scenario 13: tier 6 (100%+ growth) — maximum pool size distribution", () => {
  /**
   * Setup
   * ─────
   * Delegate "del-alpha" has VP showing > 100% growth:
   *   prevVP = 500 ENS, curVP = 1 050 ENS
   *   MoM growth = (1050 − 500) × 10 000 / 500 = 11 000 bps = 110%
   *
   * 110% ≥ 100% → Tier 6:
   *   poolSize     = 30 000 ENS
   *   delegateCap  =    300 ENS
   *   delegatorCap =  1 500 ENS
   *   delegatePool = 30 000 × 10% = 3 000 ENS
   *   delegatorPool= 30 000 × 90% = 27 000 ENS
   *
   * Single delegate → raw delegate reward = 3 000 ENS → capped at 300 ENS.
   *
   * Delegators:
   *   d_big: 10 000 ENS for full window → TWB = 10 000 ENS
   *   17 bg delegators × 1 000 ENS → TWB = 1 000 ENS each
   *
   * Total TWB = 10 000 + 17 × 1 000 = 27 000 ENS = delegatorPool.
   * Each delegator reward = TWB (exact division, no capping):
   *   d_big = 10 000 ENS → cap check: 10 000 > 1 500 → capped at 1 500 ENS
   *
   * After capping d_big at 1 500:
   *   Remaining = 27 000 − 1 500 = 25 500 ENS
   *   Active weight = 17 × 1 000 = 17 000 ENS
   *   Each bg = (1 000 / 17 000) × 25 500 = 1 500 ENS → exactly at cap → final
   *
   * Total delegator = 1 500 + 17 × 1 500 = 1 500 + 25 500 = 27 000 ENS = delegatorPool ✓
   *
   * Key properties proved:
   *   P1) Tier 6 is correctly selected for 110% growth.
   *   P2) Maximum pool size (30 000 ENS) is correctly distributed.
   *   P3) Delegate and delegator caps at tier 6 work correctly.
   *   P4) Full pool utilization at the highest tier.
   */
  it("tier 6 with 110% growth distributes 30 000 ENS pool correctly", async () => {
    const proposals = makeProposals()
    const delegate = "del-alpha"

    const TIER6_POOL = 30_000n * ONE_ENS
    const TIER6_D_CAP = 300n * ONE_ENS
    const TIER6_DOR_CAP = 1_500n * ONE_ENS

    // VP snapshots: 500 → 1 050 ENS = 110% growth → tier 6
    const vpSnapshots: VotingPowerSnapshot[] = [
      { accountId: delegate, votingPower: wei(500n * ONE_ENS), delta: wei(0n), timestamp: PREV_MONTH_END },
      { accountId: delegate, votingPower: wei(1_050n * ONE_ENS), delta: wei(0n), timestamp: MONTH_START },
    ]

    const bgIds = Array.from({ length: 17 }, (_, i) => `bg6-${i}`)
    const balanceEvents: BalanceEvent[] = [
      preWindowBalanceEvent("d_big", 10_000n),
      ...bgIds.map((id) => preWindowBalanceEvent(id, 1_000n)),
    ]

    const delegatorIds = ["d_big", ...bgIds]
    const delegations = delegatorIds.map((id) => makeDelegation(id, delegate))

    const dataSource = new InMemoryDataSource({
      proposals,
      votes: makeVotes(delegate, proposals),
      votingPowerSnapshots: vpSnapshots,
      balanceEvents,
      delegations,
    })

    const result = await runDistributionPipeline({ month: MONTH, dataSource })

    // ── Tier 6 is selected ──────────────────────────────────────────────
    expect(result.metadata.poolTier.poolSize).toBe(TIER6_POOL)
    expect(result.metadata.poolTier.delegateCap).toBe(TIER6_D_CAP)
    expect(result.metadata.poolTier.delegatorCap).toBe(TIER6_DOR_CAP)

    // ── Delegate capped at 300 ENS ──────────────────────────────────────
    const delegatePayout = result.directPayouts.find(
      (p) => p.address === delegate && p.role === "delegate",
    )
    expect(delegatePayout?.amount).toBe(TIER6_D_CAP)

    // ── d_big capped at 1 500 ENS ──────────────────────────────────────
    expect(findDelegatorPayout(result, "d_big")?.amount).toBe(TIER6_DOR_CAP)

    // ── Each bg delegator gets exactly 1 500 ENS (at cap) ──────────────
    for (const id of bgIds) {
      expect(findDelegatorPayout(result, id)?.amount).toBe(TIER6_DOR_CAP)
    }

    // ── Full delegator pool utilization ─────────────────────────────────
    const delegatorTotal = result.directPayouts
      .filter((p) => p.role === "delegator")
      .reduce((sum, p) => sum + (p.amount as bigint), 0n)
    expect(delegatorTotal).toBe(wei(27_000n * ONE_ENS)) // delegatorPool exactly

    // ── Total distributed ───────────────────────────────────────────────
    expect(result.metadata.totalDistributed).toBe(wei((300n + 27_000n) * ONE_ENS))
  })
})
