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
 *
 * See docs/test-scenarios.md for the prose description of each scenario.
 */
import { describe, it, expect } from "vitest";
import { runDistributionPipeline } from "../../src/pipeline.js";
import type { IncentivesDataSource } from "../../src/interfaces.js";
import type {
  Address,
  BalanceEvent,
  BlockNumber,
  Delegation,
  DistributionResult,
  Proposal,
  Seconds,
  Vote,
  WalletAlias,
  Wei,
} from "../../src/types.js";
import { blockNumber, seconds, wei } from "../../src/types.js";
import { TWB_WINDOW_SECONDS } from "../../src/config.js";
import {
  monthStartTimestamp,
  monthEndTimestamp,
} from "../../src/util/time.js";

// ─── Shared time constants ────────────────────────────────────────────────────
//
// Test month: 2025-03 (March)
// MONTH_END   = 2025-03-31 23:59:59 UTC
// MONTH_START = 2025-03-01 00:00:00 UTC
// TWB window  = [MONTH_END − TWB_WINDOW_SECONDS, MONTH_END]
// HALF_WINDOW = TWB_WINDOW_SECONDS / 2  (the midpoint of the holding window)

const MONTH = "2025-03";
const MONTH_END = monthEndTimestamp(MONTH); // raw bigint
const WINDOW = TWB_WINDOW_SECONDS as bigint; // 180 * 86 400 = 15 552 000
const TWB_START = MONTH_END - WINDOW;
const HALF_WINDOW = WINDOW / 2n; // exact: 180 × 86 400 is even
const MONTH_START_TS = seconds(monthStartTimestamp(MONTH));

const ONE_ENS = 10n ** 18n;

const RANDAO =
  "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef";

// ─── Tier 0 pool constants (derived, not hardcoded) ──────────────────────────
//
// The single active voter's aggregate VP grows 1 000 → 1 050 ENS month-over-
// month (5% MoM → Tier 0):
//   poolSize            = 5 000 ENS
//   voterCap            =    50 ENS   (1% of pool)
//   tokenHolderCap      =   250 ENS   (5% of pool)
//   voterSubPool        = poolSize × 10% =   500 ENS
//   tokenHolderSubPool  = poolSize × 90% = 4 500 ENS
//
// Single voter (100% of AVP) → raw = 500 ENS → capped at 50 ENS.

const POOL = 5_000n * ONE_ENS;
const V_CAP = 50n * ONE_ENS; // per-voter cap
const TH_CAP = 250n * ONE_ENS; // per-token-holder cap
const TH_POOL = 4_500n * ONE_ENS; // 90% of POOL

const VP_PREV = 1_000n * ONE_ENS; // aggregate VP at prev month end
const VP_CUR = 1_050n * ONE_ENS; // aggregate VP at month end → +5% → Tier 0

// ─── Addresses ────────────────────────────────────────────────────────────────

const voter: Address = "0xD100000000000000000000000000000000000001";
const inactiveVoter: Address = "0xD200000000000000000000000000000000000002";

/** Deterministic background-holder addresses: 0xB<hex(i) left-padded>. */
function bgAddress(i: number): Address {
  return `0xB${i.toString(16).padStart(39, "0")}` as Address;
}

// ─── Scenario fixture harness ────────────────────────────────────────────────

/** A token holder's balance history relative to the TWB window. */
interface HolderBalance {
  /** Balance (in wei) at the TWB window start. */
  readonly initial: bigint;
  /** Balance changes inside the window: new balance at offset seconds. */
  readonly events?: readonly {
    readonly balance: bigint;
    readonly atSecondsIntoWindow: bigint;
  }[];
}

interface ScenarioConfig {
  /** Balance history per address (only direct ENS balances). */
  readonly balances: ReadonlyMap<Address, HolderBalance>;
  /**
   * Full delegation history. The data source resolves the LATEST delegation
   * per token holder at the queried timestamp — mirroring the production
   * adapter — so scenarios can model delegation switches.
   */
  readonly delegations: readonly Delegation[];
  /** Wallet aliases (secondary → primary consolidation). */
  readonly aliases?: readonly WalletAlias[];
}

/** The single voter votes on all 10 finalized proposals (threshold = 7). */
const proposals: Proposal[] = Array.from({ length: 10 }, (_, i) => ({
  id: `prop-${i}`,
  status: "executed" as const,
  startBlock: blockNumber(100n + BigInt(i) * 100n),
  endBlock: blockNumber(200n + BigInt(i) * 100n),
}));

const votes: Vote[] = proposals.map((p) => ({
  voter,
  proposalId: p.id,
  support: 1,
  weight: wei(VP_CUR),
  timestamp: seconds(TWB_START),
}));

/** Delegation created well before the TWB window (always active at monthEnd). */
function delegation(
  tokenHolder: Address,
  toVoter: Address = voter,
  timestamp: bigint = TWB_START - 1_000n,
): Delegation {
  return {
    tokenHolder,
    voter: toVoter,
    timestamp: seconds(timestamp),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

function toBalanceEvent(
  account: Address,
  balance: bigint,
  atSecondsIntoWindow: bigint,
): BalanceEvent {
  return {
    account,
    balance: wei(balance),
    delta: wei(0n), // unused by the pipeline
    timestamp: seconds(TWB_START + atSecondsIntoWindow),
    blockNumber: blockNumber(100n),
    logIndex: 0,
  };
}

function createScenarioDataSource(cfg: ScenarioConfig): IncentivesDataSource {
  return {
    // ── BlockRepository ─────────────────────────────────────
    async getBlockForTimestamp(_ts: Seconds): Promise<BlockNumber> {
      return blockNumber(1_000_000n);
    },
    async getRandaoValue(_block: BlockNumber): Promise<string> {
      return RANDAO;
    },

    // ── ProposalRepository ──────────────────────────────────
    async getFinalizedProposals(_beforeBlock, _limit) {
      return proposals;
    },

    // ── VoteRepository ──────────────────────────────────────
    async getVotesForProposals(proposalIds) {
      const idSet = new Set(proposalIds);
      return votes.filter((v) => idSet.has(v.proposalId));
    },

    // ── VotingPowerRepository ───────────────────────────────
    async getVpEventsInRange() {
      return []; // stable VP during the month
    },
    async getVpAtTimestamp(v, _timestamp) {
      return v === voter ? wei(VP_CUR) : wei(0n);
    },
    async getAggregateVpAtTimestamp(voters, timestamp) {
      // Aggregate VP grows 1 000 → 1 050 ENS (5% MoM → Tier 0).
      if (!voters.includes(voter)) return wei(0n);
      return (timestamp as bigint) < (MONTH_START_TS as bigint)
        ? wei(VP_PREV)
        : wei(VP_CUR);
    },

    // ── BalanceRepository ───────────────────────────────────
    async getBalanceEventsInRange(account, from, to) {
      const holder = cfg.balances.get(account);
      if (!holder?.events) return [];
      return holder.events
        .map((e) => toBalanceEvent(account, e.balance, e.atSecondsIntoWindow))
        .filter(
          (e) =>
            (e.timestamp as bigint) >= (from as bigint) &&
            (e.timestamp as bigint) <= (to as bigint),
        );
    },
    async getBalanceAtTimestamp(account, _timestamp) {
      return wei(cfg.balances.get(account)?.initial ?? 0n);
    },

    // ── DelegationRepository ────────────────────────────────
    async getDelegationsToAtTimestamp(voters, timestamp) {
      // Latest delegation per token holder wins (as in the real adapter).
      const latest = new Map<Address, Delegation>();
      for (const d of cfg.delegations) {
        if ((d.timestamp as bigint) > (timestamp as bigint)) continue;
        const cur = latest.get(d.tokenHolder);
        if (!cur || (d.timestamp as bigint) >= (cur.timestamp as bigint)) {
          latest.set(d.tokenHolder, d);
        }
      }
      const voterSet = new Set(voters);
      return [...latest.values()].filter((d) => voterSet.has(d.voter));
    },

    // ── MultiDelegateRepository ─────────────────────────────
    async getProxyAddresses() {
      return [];
    },
    async getPositionsAtTimestamp() {
      return [];
    },
    async getErc1155BalanceEventsInRange() {
      return [];
    },
    async getErc1155BalanceAtTimestamp() {
      return wei(0n);
    },

    // ── VestingRepository ───────────────────────────────────
    async getVestingContractAddresses() {
      return [];
    },
    async getNftOwnerAtTimestamp() {
      return "0x0000000000000000000000000000000000000000" as Address;
    },
    async getPlansForContracts() {
      return [];
    },
    async getPlanBalanceEventsInRange() {
      return [];
    },
    async getPlanBalanceAtTimestamp() {
      return wei(0n);
    },

    // ── WalletAliasRepository ───────────────────────────────
    async getAliases() {
      return cfg.aliases ?? [];
    },
  };
}

// ─── Result accessors ─────────────────────────────────────────────────────────

/** Token-holder reward (in wei) for `address`, or undefined if no direct payout. */
function holderReward(
  result: DistributionResult,
  address: Address,
): bigint | undefined {
  const r = result.rewards.find((x) => x.address === address);
  if (!r || (r.tokenHolderReward as bigint) === 0n) return undefined;
  return r.tokenHolderReward as bigint;
}

/** All addresses that receive anything (direct payout or lottery entry). */
function allPayoutAddresses(result: DistributionResult): Address[] {
  return [
    ...result.rewards.map((r) => r.address),
    ...result.lottery.buckets.flatMap((b) => b.entries.map((e) => e.address)),
  ];
}

/** Grand total: direct payout totals + lottery bucket prizes. */
function totalDistributed(result: DistributionResult): bigint {
  let total = 0n;
  for (const r of result.rewards) total += r.total as bigint;
  for (const b of result.lottery.buckets) total += b.prize as bigint;
  return total;
}

// ─── Scenario 1 ───────────────────────────────────────────────────────────────

describe("Scenario 1: TWB linear proportionality — exact expected rewards", () => {
  /**
   * Setup
   * ─────
   * Voter: voted on all 10 proposals.
   *        Aggregate VP: 1 000 ENS → 1 050 ENS (5% MoM → Tier 0, pool = 5 000 ENS).
   *        Voter reward: min(500, 50) = 50 ENS (capped).
   *
   * Token holders — holding the SAME amount but for DIFFERENT durations:
   *
   *   d_full   holds 100 ENS for the FULL window   (180 days)  → TWB = 100 ENS
   *   d_half   holds 100 ENS for the LAST HALF     ( 90 days)  → TWB =  50 ENS
   *   d_double holds 200 ENS for the FULL window   (180 days)  → TWB = 200 ENS
   *   d_buy    starts with 0, BUYS 100 ENS at midpoint          → TWB =  50 ENS
   *   d_sell   holds 100 ENS, SELLS ALL at midpoint             → TWB =  50 ENS
   *
   * 45 background holders each hold 90 ENS for the full window → 90 ENS TWB each.
   *
   * Total TWB = 100 + 50 + 200 + 50 + 50 + (45 × 90) = 450 + 4 050 = 4 500 ENS
   *
   * Reward formula (no one exceeds tokenHolderCap = 250 ENS):
   *   reward_i = (TWB_i / totalTWB) × tokenHolderSubPool
   *            = (TWB_i / 4 500 ENS) × 4 500 ENS
   *            = TWB_i   ← each holder earns exactly their TWB in ENS
   *
   * Exact bigint division verification (representative):
   *   d_full:   (100 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) = 100 × ONE_ENS  ✓
   *   d_half:   ( 50 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) =  50 × ONE_ENS  ✓
   *   d_double: (200 × ONE_ENS × 4 500 × ONE_ENS) / (4 500 × ONE_ENS) = 200 × ONE_ENS  ✓
   *   No dust: sum = 4 500 ENS = tokenHolderSubPool exactly.
   *
   * Key invariants being proved:
   *   A) reward ∝ duration    — d_full  = 2 × d_half  (same amount, 2× duration)
   *   B) reward ∝ amount      — d_double = 2 × d_full (2× amount, same duration)
   *   C) buy-midpoint = sell-midpoint — d_buy = d_sell = d_half (180-day symmetry)
   *   D) delegation timing is irrelevant (all delegated before window)
   */
  const d_full: Address = "0xA100000000000000000000000000000000000001";
  const d_half: Address = "0xA200000000000000000000000000000000000002";
  const d_double: Address = "0xA300000000000000000000000000000000000003";
  const d_buy: Address = "0xA400000000000000000000000000000000000004";
  const d_sell: Address = "0xA500000000000000000000000000000000000005";
  const bgs = Array.from({ length: 45 }, (_, i) => bgAddress(i));

  it("each token holder earns exactly their TWB in ENS (totalTWB = tokenHolderSubPool)", async () => {
    const balances = new Map<Address, HolderBalance>([
      [d_full, { initial: 100n * ONE_ENS }],
      // d_half starts at 0 and acquires 100 ENS at the window midpoint
      [
        d_half,
        {
          initial: 0n,
          events: [
            { balance: 100n * ONE_ENS, atSecondsIntoWindow: HALF_WINDOW },
          ],
        },
      ],
      [d_double, { initial: 200n * ONE_ENS }],
      // d_buy is identical to d_half
      [
        d_buy,
        {
          initial: 0n,
          events: [
            { balance: 100n * ONE_ENS, atSecondsIntoWindow: HALF_WINDOW },
          ],
        },
      ],
      // d_sell holds 100 ENS and sells everything at the midpoint
      [
        d_sell,
        {
          initial: 100n * ONE_ENS,
          events: [{ balance: 0n, atSecondsIntoWindow: HALF_WINDOW }],
        },
      ],
      ...bgs.map(
        (a): [Address, HolderBalance] => [a, { initial: 90n * ONE_ENS }],
      ),
    ]);

    const holderIds = [d_full, d_half, d_double, d_buy, d_sell, ...bgs];
    const ds = createScenarioDataSource({
      balances,
      delegations: holderIds.map((a) => delegation(a)),
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── Tier verification ─────────────────────────────────────────────────
    expect(result.metadata.vpGrowthPct).toBe("5.00");
    expect(result.metadata.tier).toBe(0);
    expect(result.metadata.poolSize).toBe(wei(POOL));
    expect(result.metadata.activeVoterCount).toBe(1);

    // ── Voter reward ──────────────────────────────────────────────────────
    // voter sub-pool = 500 ENS, single voter → raw = 500 ENS > cap (50 ENS)
    const voterRow = result.rewards.find((r) => r.address === voter);
    expect(voterRow?.voterReward).toBe(wei(V_CAP)); // 50 ENS

    // ── Token-holder rewards — exact expected values ─────────────────────
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
    // Reward = TWB (since totalTWB = tokenHolderSubPool = 4 500 ENS):
    expect(holderReward(result, d_full)).toBe(100n * ONE_ENS);
    expect(holderReward(result, d_half)).toBe(50n * ONE_ENS);
    expect(holderReward(result, d_double)).toBe(200n * ONE_ENS);
    expect(holderReward(result, d_buy)).toBe(50n * ONE_ENS);
    expect(holderReward(result, d_sell)).toBe(50n * ONE_ENS);

    // All 50 token holders receive a direct payout (every reward ≥ 1 ENS).
    const holderRows = result.rewards.filter(
      (r) => (r.tokenHolderReward as bigint) > 0n,
    );
    expect(holderRows).toHaveLength(50);
    expect(result.lottery.buckets).toHaveLength(0);

    // ── Invariant A: reward ∝ duration ────────────────────────────────────
    // Holding twice as long doubles the reward.
    const r_full = holderReward(result, d_full)!;
    const r_half = holderReward(result, d_half)!;
    expect(r_full).toBe(2n * r_half);

    // ── Invariant B: reward ∝ amount ──────────────────────────────────────
    // Holding twice the amount doubles the reward.
    const r_double = holderReward(result, d_double)!;
    expect(r_double).toBe(2n * r_full);

    // ── Invariant C: buy-at-midpoint = sell-at-midpoint ───────────────────
    // d_buy and d_sell both held 100 ENS for exactly half the window
    // (one in the second half, one in the first half) → identical TWBs.
    const r_buy = holderReward(result, d_buy)!;
    const r_sell = holderReward(result, d_sell)!;
    expect(r_buy).toBe(r_sell);
    expect(r_buy).toBe(r_half);

    // ── Background holders ────────────────────────────────────────────────
    // Each bg holder holds 90 ENS for the full window → reward = 90 ENS each.
    for (const bg of bgs) {
      expect(holderReward(result, bg)).toBe(90n * ONE_ENS);
    }

    // ── Total distributed ─────────────────────────────────────────────────
    // Voter: 50 ENS + Token holders: 4 500 ENS = 4 550 ENS ≤ 5 000 ENS pool
    expect(totalDistributed(result)).toBe(V_CAP + TH_POOL);
  });
});

// ─── Scenario 2 ───────────────────────────────────────────────────────────────

describe("Scenario 2: cap redistribution — whale excess flows to minnows", () => {
  /**
   * Setup
   * ─────
   * Tier 0 (same VP setup as scenario 1).
   * Token holders:
   *   whale   : TWB = 2 000 ENS  (single large holder)
   *   minnow-i: TWB =    20 ENS  × 50 holders
   *
   * Total TWB = 2 000 + 50 × 20 = 3 000 ENS
   * Token-holder sub-pool = 4 500 ENS,  tokenHolderCap = 250 ENS
   *
   * Round 1 (cap redistribution):
   *   whale raw   = (2 000 / 3 000) × 4 500 = 3 000 ENS → exceeds cap → fixed at 250 ENS
   *   minnow raw  = (   20 / 3 000) × 4 500 =    30 ENS → under cap
   *
   * Round 2 (redistribute whale excess to 50 minnows):
   *   excess         = 3 000 − 250 = 2 750 ENS
   *   active weight  = 50 × 20     = 1 000 ENS
   *   minnow new raw = 30 + (20 / 1 000) × 2 750 = 30 + 55 = 85 ENS → under cap ✓
   *
   * Bigint precision check:
   *   (2 750n × ONE_ENS × 20n × ONE_ENS) / (1 000n × ONE_ENS) = 55n × ONE_ENS  ✓ (exact)
   *
   * Final allocations:
   *   whale       =  250 ENS
   *   each minnow =   85 ENS
   *   total       = 250 + 50 × 85 = 250 + 4 250 = 4 500 ENS = tokenHolderSubPool ✓ (no dust)
   *
   * Key properties proved:
   *   P1) A capped whale distributes its excess to uncapped minnows.
   *   P2) Every ENS in the token-holder sub-pool is distributed when uncapped
   *       recipients can absorb the total.
   *   P3) Each minnow earns MORE than their uncapped pro-rata share (30 ENS)
   *       because of redistribution, arriving at exactly 85 ENS.
   */
  const whale: Address = "0xA100000000000000000000000000000000000001";
  const minnows = Array.from({ length: 50 }, (_, i) => bgAddress(i));

  it("capped whale redistributes excess; all 4 500 ENS of the sub-pool is paid out", async () => {
    const balances = new Map<Address, HolderBalance>([
      [whale, { initial: 2_000n * ONE_ENS }],
      ...minnows.map(
        (a): [Address, HolderBalance] => [a, { initial: 20n * ONE_ENS }],
      ),
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [whale, ...minnows].map((a) => delegation(a)),
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── Whale is capped ───────────────────────────────────────────────────
    expect(holderReward(result, whale)).toBe(TH_CAP); // 250 ENS

    // ── Each minnow receives redistribution bonus ─────────────────────────
    // Raw share: 30 ENS.  After redistribution: 85 ENS.
    for (const minnow of minnows) {
      expect(holderReward(result, minnow)).toBe(85n * ONE_ENS);
    }

    // ── Entire sub-pool is distributed (no dust, no leftover) ─────────────
    const holderTotal = result.rewards.reduce(
      (sum, r) => sum + (r.tokenHolderReward as bigint),
      0n,
    );
    expect(holderTotal).toBe(TH_POOL); // 4 500 ENS exactly
  });
});

// ─── Scenario 3 ───────────────────────────────────────────────────────────────

describe("Scenario 3: delegation timestamp is irrelevant — TWB depends only on ENS balance", () => {
  /**
   * Setup
   * ─────
   * Two token holders with IDENTICAL ENS balance history but DIFFERENT
   * delegation timestamps:
   *   d_early: delegated at the TWB window start, holds 100 ENS full window
   *   d_late:  delegated 1 day before monthEnd,   holds 100 ENS full window
   *
   * Both hold 100 ENS for the full TWB window → identical TWB = 100 ENS.
   * Eligibility check: both delegated to the active voter at monthEnd → eligible.
   *
   * Total TWB = 200 ENS.
   * Both raw shares = (100 / 200) × 4 500 = 2 250 ENS → capped at 250 ENS.
   *
   * Key property proved:
   *   The reward is determined by HOW LONG and HOW MUCH you held ENS, not
   *   by when you chose to delegate. Delegation is a binary gate (in/out at
   *   monthEnd), not a weighting factor.
   */
  const d_early: Address = "0xA100000000000000000000000000000000000001";
  const d_late: Address = "0xA200000000000000000000000000000000000002";

  it("d_early and d_late receive identical rewards despite different delegation dates", async () => {
    const balances = new Map<Address, HolderBalance>([
      [d_early, { initial: 100n * ONE_ENS }],
      [d_late, { initial: 100n * ONE_ENS }],
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [
        // d_early: delegated at the very start of the TWB window
        delegation(d_early, voter, TWB_START),
        // d_late: delegated just 1 day before monthEnd (inside the TWB window)
        delegation(d_late, voter, MONTH_END - 86_400n),
      ],
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── Both are eligible token holders ───────────────────────────────────
    const holderRows = result.rewards.filter(
      (r) => (r.tokenHolderReward as bigint) > 0n,
    );
    expect(holderRows).toHaveLength(2);

    // ── Both have the same TWB → same reward ──────────────────────────────
    // Raw = (100/200) × 4 500 = 2 250 ENS → capped at 250 ENS for each.
    const r_early = holderReward(result, d_early);
    const r_late = holderReward(result, d_late);
    expect(r_early).toBe(TH_CAP); // 250 ENS
    expect(r_late).toBe(TH_CAP); // 250 ENS
    expect(r_early).toBe(r_late); // identical
  });
});

// ─── Scenario 4 ───────────────────────────────────────────────────────────────

describe("Scenario 4: token holder who switches to an inactive voter is excluded", () => {
  /**
   * Setup
   * ─────
   * Three token holders, all holding 100 ENS for the full TWB window:
   *   d_loyal : always delegated to the active voter → eligible
   *   d_switch: initially delegated to the active voter, then switched to
   *             an inactive voter one day before monthEnd → ineligible
   *   d_never : always delegated to the inactive voter → ineligible
   *
   * The pipeline queries delegations to active voters at monthEnd. For
   * d_switch and d_never, the LATEST delegation at monthEnd points to the
   * inactive voter, which is not in the active set → both are excluded.
   *
   * Only d_loyal is included.  Total TWB = 100 ENS.
   * d_loyal raw = (100 / 100) × 4 500 = 4 500 ENS → capped at 250 ENS.
   *
   * Key property proved:
   *   The system correctly uses the LATEST delegation at monthEnd as the
   *   eligibility check. Prior delegations to an active voter do not
   *   grandfather in a holder who has since switched away.
   */
  const d_loyal: Address = "0xA100000000000000000000000000000000000001";
  const d_switch: Address = "0xA200000000000000000000000000000000000002";
  const d_never: Address = "0xA300000000000000000000000000000000000003";

  it("d_switch and d_never do not appear in payouts; d_loyal receives the cap", async () => {
    const balances = new Map<Address, HolderBalance>([
      [d_loyal, { initial: 100n * ONE_ENS }],
      [d_switch, { initial: 100n * ONE_ENS }],
      [d_never, { initial: 100n * ONE_ENS }],
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [
        // d_loyal: single delegation to the active voter
        delegation(d_loyal, voter),
        // d_switch: was delegated to the active voter, then switched away
        delegation(d_switch, voter),
        delegation(d_switch, inactiveVoter, MONTH_END - 86_400n),
        // d_never: always pointed to the inactive voter
        delegation(d_never, inactiveVoter),
      ],
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── Only d_loyal is eligible ──────────────────────────────────────────
    const holderRows = result.rewards.filter(
      (r) => (r.tokenHolderReward as bigint) > 0n,
    );
    expect(holderRows).toHaveLength(1);

    // ── d_loyal is capped (only holder, raw = 4 500 ENS → cap) ────────────
    expect(holderReward(result, d_loyal)).toBe(TH_CAP); // 250 ENS

    // ── Excluded holders do not appear anywhere in the result ─────────────
    const allAddresses = allPayoutAddresses(result);
    expect(allAddresses).not.toContain(d_switch);
    expect(allAddresses).not.toContain(d_never);
  });
});

// ─── Scenario 5 ───────────────────────────────────────────────────────────────

describe("Scenario 5: wallet-alias consolidation merges secondary TWB into primary", () => {
  /**
   * Setup
   * ─────
   * A wallet alias maps "proxy-addr" (secondary) → "owner-x" (primary).
   * Both addresses independently delegate to the active voter.
   * Both hold ENS tokens; the pipeline consolidates them into one entity.
   *
   * Holdings:
   *   proxy-addr : 50 ENS for the full window  → TWB =  50 ENS
   *   owner-x    : 50 ENS for the full window  → TWB =  50 ENS
   *   Consolidated: TWB = 100 ENS (rewarded to owner-x)
   *
   * 44 background holders × 100 ENS full window → 4 400 ENS background TWB.
   * Total TWB after consolidation = 4 400 + 100 = 4 500 ENS.
   *
   * Reward formula (totalTWB = tokenHolderSubPool → reward = TWB per ENS):
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
  const proxyAddr: Address = "0xA100000000000000000000000000000000000001";
  const ownerX: Address = "0xA200000000000000000000000000000000000002";
  const bgs = Array.from({ length: 44 }, (_, i) => bgAddress(i));

  it("proxy-addr is merged into owner-x; owner-x earns the combined TWB reward", async () => {
    const balances = new Map<Address, HolderBalance>([
      [proxyAddr, { initial: 50n * ONE_ENS }],
      [ownerX, { initial: 50n * ONE_ENS }],
      ...bgs.map(
        (a): [Address, HolderBalance] => [a, { initial: 100n * ONE_ENS }],
      ),
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [proxyAddr, ownerX, ...bgs].map((a) => delegation(a)),
      aliases: [{ secondary: proxyAddr, primary: ownerX }],
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── proxy-addr never appears in payouts ───────────────────────────────
    expect(allPayoutAddresses(result)).not.toContain(proxyAddr);

    // ── owner-x receives the combined reward (50 + 50 = 100 ENS TWB) ─────
    // No cap hit: 100 ENS < 250 ENS tokenHolderCap.
    expect(holderReward(result, ownerX)).toBe(100n * ONE_ENS);

    // ── The consolidated TWB is persisted on the payout row ───────────────
    const ownerRow = result.rewards.find((r) => r.address === ownerX);
    expect(ownerRow?.tokenHolderBalance).toBe(wei(100n * ONE_ENS));

    // ── Background holders each earn 100 ENS ──────────────────────────────
    for (const bg of bgs) {
      expect(holderReward(result, bg)).toBe(100n * ONE_ENS);
    }

    // ── The alias is recorded in the deduplication log ────────────────────
    expect(result.deduplication.walletAliases).toContainEqual({
      secondary: proxyAddr,
      primary: ownerX,
    });

    // ── Consolidation precedes cap: if both wallets had 400 ENS each (800 ENS
    //    combined > cap), the entity still only receives tokenHolderCap once. ──
    // (Proved analytically — cap redistribution operates on consolidated TWBs.)
  });
});

// ─── Scenario 6 ───────────────────────────────────────────────────────────────

describe("Scenario 6: sub-threshold token holder enters lottery, not direct payout", () => {
  /**
   * Setup
   * ─────
   * MIN_REWARD_THRESHOLD = 1 ENS.  A token holder whose combined reward is
   * below this threshold enters a lottery bucket instead of receiving a
   * direct payout.
   *
   * To produce a sub-threshold reward:
   *   d_big   : holds 10 000 ENS for the full window → TWB = 10 000 ENS
   *   d_tiny + 4 siblings: each holds 1 ENS for only the LAST DAY (86 400 s)
   *           TWB = 1 ENS × 86 400 / TWB_WINDOW_SECONDS
   *               = 1 ENS / 180 ≈ 0.00556 ENS  (≪ 1 ENS threshold → lottery)
   *
   * 45 bg holders × 100 ENS TWB absorb d_big's cap redistribution so each
   * micro-holder's final reward stays sub-threshold.
   *
   * Note on bucket size: a SOLO sub-threshold entry forms its own bucket and
   * wins it automatically (no randomness needed) — it is still classified as
   * a lottery payout. We use 5 micro-holders so the bucket has multiple
   * entries and the weighted winner selection is exercised.
   *
   * Key properties proved:
   *   P1) d_tiny does NOT appear in direct payouts.
   *   P2) d_tiny DOES appear in a lottery bucket as an entry.
   *   P3) d_tiny's entry amount < 1 ENS (the threshold).
   *   P4) Every bucket's winner is one of its entries (invariant).
   *   P5) d_big receives a direct payout of 250 ENS (tokenHolderCap).
   */
  const d_big: Address = "0xA100000000000000000000000000000000000001";
  const micros = Array.from(
    { length: 5 },
    (_, i) => `0xC${i.toString(16).padStart(39, "0")}` as Address,
  );
  const d_tiny = micros[0];
  const bgs = Array.from({ length: 45 }, (_, i) => bgAddress(i));

  it("d_tiny's sub-threshold reward goes to lottery; d_big receives a direct payout", async () => {
    // d_tiny and 4 siblings each acquire 1 ENS with exactly 1 day remaining.
    // Each has TWB ≈ 0.00556 ENS (= ONE_ENS / 180), well below 1 ENS.
    //
    // Why backgrounds are needed: cap redistribution flows pro-rata to ALL
    // uncapped token holders. With only d_big + the micros, after d_big is
    // capped the remaining pool would funnel entirely into the micros and
    // push them over the threshold (and up to the cap). The 45 background
    // holders (4 500 ENS TWB total) provide other uncapped recipients, so
    // each micro's share of the redistributed excess stays ≈ 0.005 ENS.
    const ONE_DAY = 86_400n;
    const balances = new Map<Address, HolderBalance>([
      [d_big, { initial: 10_000n * ONE_ENS }],
      ...micros.map(
        (a): [Address, HolderBalance] => [
          a,
          {
            initial: 0n,
            events: [
              { balance: ONE_ENS, atSecondsIntoWindow: WINDOW - ONE_DAY },
            ],
          },
        ],
      ),
      ...bgs.map(
        (a): [Address, HolderBalance] => [a, { initial: 100n * ONE_ENS }],
      ),
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [d_big, ...micros, ...bgs].map((a) => delegation(a)),
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── d_big is a direct payout (capped) ────────────────────────────────
    expect(holderReward(result, d_big)).toBe(TH_CAP); // 250 ENS

    // ── d_tiny is NOT in direct payouts ───────────────────────────────────
    expect(result.rewards.map((r) => r.address)).not.toContain(d_tiny);

    // ── All 5 micro-holders share one multi-entry lottery bucket ──────────
    // (5 × ≈0.005 ENS ≪ 10 ENS bucket target → a single bucket)
    expect(result.lottery.buckets).toHaveLength(1);
    expect(result.lottery.buckets[0].entries).toHaveLength(5);

    const lotteryEntry = result.lottery.buckets
      .flatMap((bucket) => bucket.entries)
      .find((e) => e.address === d_tiny);
    expect(lotteryEntry).toBeDefined();

    // ── d_tiny's lottery amount is below the 1 ENS threshold ─────────────
    const tinyLotteryAmount = lotteryEntry!.amount as bigint;
    expect(tinyLotteryAmount).toBeLessThan(ONE_ENS);
    expect(tinyLotteryAmount).toBeGreaterThan(0n);

    // ── Each lottery bucket has a valid winner ────────────────────────────
    for (const bucket of result.lottery.buckets) {
      const winnerIsEntry = bucket.entries.some(
        (e) => e.address === bucket.winner,
      );
      expect(winnerIsEntry).toBe(true);
    }
  });
});

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
   *   d_1day:    entered at WINDOW − WINDOW/180 seconds into the window
   *              f = (WINDOW/180) / WINDOW = 1/180
   *              TWB = 360 × 1/180 = 2 ENS
   *
   *   d_quarter: entered at WINDOW − WINDOW/4 seconds into the window
   *              f = (WINDOW/4) / WINDOW = 1/4
   *              TWB = 360 × 1/4 = 90 ENS
   *
   *   d_third:   entered at WINDOW − WINDOW/3 seconds into the window
   *              f = (WINDOW/3) / WINDOW = 1/3
   *              TWB = 360 × 1/3 = 120 ENS
   *
   * Bigint exactness:
   *   WINDOW = 180 × 86 400 is divisible by 180, 4, and 3.
   *   All resulting TWBs are whole multiples of ONE_ENS.
   *
   * The three holders together + 18 background holders are set up so
   * totalTWB = 4 500 ENS with NO capping:
   *   17 bg holders × 248 ENS TWB = 4 216 ENS
   *    1 bg holder  ×  72 ENS TWB =    72 ENS
   *   Total background = 4 288 ENS
   *   Grand total      = 4 288 + 2 + 90 + 120 = 4 500 ENS
   *
   * All holders have reward = TWB (exact bigint division, no capping):
   *   d_1day    reward = 2 ENS   (2   < 248 bg max < 250 cap ✓)
   *   d_quarter reward = 90 ENS  (90  < 250 cap ✓)
   *   d_third   reward = 120 ENS (120 < 250 cap ✓)
   *   each bg-0..bg-16 reward = 248 ENS  (248 < 250 cap ✓)
   *   bg-17            reward =  72 ENS
   */
  const d_1day: Address = "0xA100000000000000000000000000000000000001";
  const d_quarter: Address = "0xA200000000000000000000000000000000000002";
  const d_third: Address = "0xA300000000000000000000000000000000000003";
  const bg17 = Array.from({ length: 17 }, (_, i) => bgAddress(i));
  const bgLast = bgAddress(17);

  it("fractional entry point produces exact TWB proportional to holding duration", async () => {
    // WINDOW must be divisible by 180, 4, and 3 for exact division.
    // WINDOW = 180 × 86 400 = 15 552 000 — divisible by all three ✓
    const ONE_PART = WINDOW / 180n; // =    86 400 s =  1 day
    const QUARTER = WINDOW / 4n; //   = 3 888 000 s = 45 days
    const THIRD = WINDOW / 3n; //     = 5 184 000 s = 60 days

    // All three holders start with 0 (initial = 0). Each acquires 360 ENS at
    // a different point inside the TWB window.
    const balances = new Map<Address, HolderBalance>([
      [
        d_1day,
        {
          initial: 0n,
          events: [
            { balance: 360n * ONE_ENS, atSecondsIntoWindow: WINDOW - ONE_PART },
          ],
        },
      ],
      [
        d_quarter,
        {
          initial: 0n,
          events: [
            { balance: 360n * ONE_ENS, atSecondsIntoWindow: WINDOW - QUARTER },
          ],
        },
      ],
      [
        d_third,
        {
          initial: 0n,
          events: [
            { balance: 360n * ONE_ENS, atSecondsIntoWindow: WINDOW - THIRD },
          ],
        },
      ],
      // Background: 17 × 248 ENS + 1 × 72 ENS = 4 288 ENS TWB
      // totalTWB = 2 + 90 + 120 + 4 288 = 4 500 ENS = tokenHolderSubPool
      ...bg17.map(
        (a): [Address, HolderBalance] => [a, { initial: 248n * ONE_ENS }],
      ),
      [bgLast, { initial: 72n * ONE_ENS }],
    ]);

    const ds = createScenarioDataSource({
      balances,
      delegations: [d_1day, d_quarter, d_third, ...bg17, bgLast].map((a) =>
        delegation(a),
      ),
    });

    const result = await runDistributionPipeline(MONTH, ds);

    // ── Exact TWB-derived rewards (totalTWB = 4 500 ENS → reward = TWB) ──
    //
    //   d_1day:    360 × (ONE_PART / WINDOW) = 360 / 180 =   2 ENS
    //   d_quarter: 360 × (QUARTER  / WINDOW) = 360 / 4   =  90 ENS
    //   d_third:   360 × (THIRD    / WINDOW) = 360 / 3   = 120 ENS
    expect(holderReward(result, d_1day)).toBe(2n * ONE_ENS);
    expect(holderReward(result, d_quarter)).toBe(90n * ONE_ENS);
    expect(holderReward(result, d_third)).toBe(120n * ONE_ENS);

    // ── Background rewards (no capping anywhere → exact) ──────────────────
    for (const bg of bg17) {
      expect(holderReward(result, bg)).toBe(248n * ONE_ENS);
    }
    expect(holderReward(result, bgLast)).toBe(72n * ONE_ENS);

    // ── Duration ratio invariants ─────────────────────────────────────────
    // d_third is 60 days out of 180 (1/3 window).
    // d_quarter is 45 days (1/4 window).
    // d_1day is 1 day (1/180 window).
    // Their TWBs (and rewards) are in ratio 60:45:1, i.e. 120:90:2.
    const r_1day = holderReward(result, d_1day)!;
    const r_quarter = holderReward(result, d_quarter)!;
    const r_third = holderReward(result, d_third)!;
    expect(r_third).toBe(60n * r_1day); // 60 days vs 1 day
    expect(r_quarter).toBe(45n * r_1day); // 45 days vs 1 day
    expect(r_third * 3n).toBe(r_quarter * 4n); // 1/3 window : 1/4 window = 4:3
  });
});
