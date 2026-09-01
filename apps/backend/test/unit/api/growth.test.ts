import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { wei, POOL_TIERS, BlockNotFinalizedError, blockNumber } from "@ens-dis/domain";
import { publicClients } from "ponder:api";
import { FakePonderDb, type Row } from "../../doubles/fake-ponder-db.js";
import {
  assembleGrowth,
  fetchCurrentGrowth,
  resetGrowthCaches,
} from "../../../src/api/helpers.js";

const getBlockForTimestamp = vi.hoisted(() => vi.fn());
vi.mock("../../../src/adapters/block-adapter.js", () => ({
  createBlockAdapter: () => ({ getBlockForTimestamp }),
}));

const isLocalPonderReady = vi.hoisted(() => vi.fn());
vi.mock("../../../src/api/distribution-scheduler.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  isLocalPonderReady,
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────
//
// Frozen at 2026-08-15 so month boundaries are deterministic:
// monthStart = Aug 1 00:00:00 UTC, prevMonthEnd = Jul 31 23:59:59 UTC.
const NOW = new Date("2026-08-15T12:00:00Z");
const MONTH_START_BLOCK = 1_500n;
const HEAD_BLOCK = 3_000n;

const WHALE = "0x1111111111111111111111111111111111111111";
const VOTER = "0x2222222222222222222222222222222222222222";

function proposalRow(id: string, endBlock: bigint): Row {
  return {
    id,
    proposer: "0x9999999999999999999999999999999999999999",
    startBlock: endBlock - 10n,
    endBlock,
    timestamp: 1n,
    description: `Proposal ${id}`,
    status: "executed",
    finalizedTimestamp: 2n,
  };
}

function voteRow(voter: string, proposalId: string): Row {
  return { id: `${voter}-${proposalId}`, voter, proposalId };
}

function vpRow(
  voterId: string,
  votingPower: string,
  timestamp: bigint,
  block: bigint,
  logIndex: number,
): Row {
  return {
    id: `${voterId}-${block}-${logIndex}`,
    voterId,
    votingPower,
    timestamp,
    blockNumber: block,
    logIndex,
  };
}

/**
 * Ten proposals (P1..P10) finalized before the month-start block, plus P11
 * finalized only before the chain head — so the start window is P1..P10 and
 * the end window is P2..P11.
 */
function seedProposals(): Row[] {
  const rows: Row[] = [];
  for (let i = 1; i <= 10; i++) {
    rows.push(proposalRow(`P${i}`, BigInt(i) * 100n));
  }
  rows.push(proposalRow("P11", 2_000n));
  return rows;
}

function votesFor(voter: string, proposals: string[]): Row[] {
  return proposals.map((p) => voteRow(voter, p));
}

function range(from: number, to: number): string[] {
  const out: string[] = [];
  for (let i = from; i <= to; i++) out.push(`P${i}`);
  return out;
}

function makeDb(votes: Row[], snapshots: Row[]): FakePonderDb {
  return new FakePonderDb({
    governance_proposal: seedProposals(),
    governance_vote: votes,
    ens_voting_power_snapshot: snapshots,
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  resetGrowthCaches();
  getBlockForTimestamp.mockReset();
  getBlockForTimestamp.mockResolvedValue(blockNumber(MONTH_START_BLOCK));
  isLocalPonderReady.mockReset();
  isLocalPonderReady.mockResolvedValue(true);
  (publicClients as any).mainnet = {
    getBlockNumber: vi.fn(async () => HEAD_BLOCK),
  };
});

afterEach(() => {
  vi.useRealTimers();
});

// ─── fetchCurrentGrowth ──────────────────────────────────────────────────────

describe("fetchCurrentGrowth", () => {
  it("uses two active sets: a whale active at month start but not at head counts as negative growth", async () => {
    // WHALE: 7/10 in the start window (P1..P7) but 6/10 in the end window
    // (P2..P11 only contains P2..P7). VOTER: active in both windows.
    const db = makeDb(
      [...votesFor(WHALE, range(1, 7)), ...votesFor(VOTER, range(2, 11))],
      [
        vpRow(WHALE, "3000", 100n, 10n, 0),
        // Two snapshots in the same second/block: the tie-break must pick the
        // higher logIndex (1000), exactly like the pipeline's adapter.
        vpRow(VOTER, "500", 100n, 10n, 1),
        vpRow(VOTER, "1000", 100n, 10n, 2),
      ],
    );

    const result = await fetchCurrentGrowth(db as any);

    expect(result.degraded).toBe(false);
    expect([...result.activeVoters]).toEqual([VOTER]);
    expect(result.vpStart as bigint).toBe(4000n); // whale 3000 + voter 1000
    expect(result.vpEnd as bigint).toBe(1000n); // voter only, tie-broken row
    expect(result.growthPct).toBe(-75);
    expect(result.tier).toBe(POOL_TIERS[0]);
  });

  it("returns growth 0 (not -100%) when the end set is empty, mirroring the pipeline early-exit", async () => {
    // WHALE active only in the start window; VOTER never reaches 7 votes.
    const db = makeDb(
      [...votesFor(WHALE, range(1, 7)), ...votesFor(VOTER, range(2, 6))],
      [vpRow(WHALE, "3000", 100n, 10n, 0)],
    );

    const result = await fetchCurrentGrowth(db as any);

    expect(result.activeVoters.size).toBe(0);
    expect(result.vpStart as bigint).toBe(3000n);
    expect(result.growthPct).toBe(0);
    expect(result.tier).toBe(POOL_TIERS[0]);
  });

  it("degrades to the current window while the month-start block is not finalized, then recovers", async () => {
    getBlockForTimestamp.mockRejectedValueOnce(
      new BlockNotFinalizedError(1n, 0n, 0n),
    );
    const db = makeDb(
      [...votesFor(WHALE, range(1, 7)), ...votesFor(VOTER, range(2, 11))],
      [vpRow(WHALE, "3000", 100n, 10n, 0), vpRow(VOTER, "1000", 100n, 10n, 0)],
    );

    const degradedResult = await fetchCurrentGrowth(db as any);

    // Same (end) set on both boundaries: growth is flat, and flagged.
    expect(degradedResult.degraded).toBe(true);
    expect(degradedResult.vpStart as bigint).toBe(1000n);
    expect(degradedResult.vpEnd as bigint).toBe(1000n);
    expect(degradedResult.growthPct).toBe(0);

    // The "not finalized" outcome must not be cached: once the memo expires
    // and the block resolves, the real two-set growth appears.
    vi.setSystemTime(new Date(NOW.getTime() + 31_000));
    const recovered = await fetchCurrentGrowth(db as any);

    expect(recovered.degraded).toBe(false);
    expect(recovered.vpStart as bigint).toBe(4000n);
    expect(recovered.growthPct).toBe(-75);
  });

  it("degrades — without caching a partial start set — while the indexer is backfilling", async () => {
    isLocalPonderReady.mockResolvedValueOnce(false);
    const db = makeDb(
      [...votesFor(WHALE, range(1, 7)), ...votesFor(VOTER, range(2, 11))],
      [vpRow(WHALE, "3000", 100n, 10n, 0), vpRow(VOTER, "1000", 100n, 10n, 0)],
    );

    const during = await fetchCurrentGrowth(db as any);
    expect(during.degraded).toBe(true);
    expect(getBlockForTimestamp).not.toHaveBeenCalled();

    // Once the indexer is ready (and the memo expires), the real two-set
    // growth appears — nothing partial was pinned for the month.
    vi.setSystemTime(new Date(NOW.getTime() + 31_000));
    const after = await fetchCurrentGrowth(db as any);
    expect(after.degraded).toBe(false);
    expect(after.vpStart as bigint).toBe(4000n);
    expect(after.growthPct).toBe(-75);
  });

  it("memoizes concurrent and near-in-time calls so one page load shares a single computation", async () => {
    const db = makeDb(
      [...votesFor(VOTER, range(2, 11))],
      [vpRow(VOTER, "1000", 100n, 10n, 0)],
    );

    const [a, b] = await Promise.all([
      fetchCurrentGrowth(db as any),
      fetchCurrentGrowth(db as any),
    ]);
    const c = await fetchCurrentGrowth(db as any);

    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(getBlockForTimestamp).toHaveBeenCalledTimes(1);
    // Only the end-set fetch reads the chain head (the start set is bounded
    // by the resolved month-start block), and it runs once thanks to the memo.
    expect(
      (publicClients as any).mainnet.getBlockNumber,
    ).toHaveBeenCalledTimes(1);
  });
});

// ─── assembleGrowth ──────────────────────────────────────────────────────────

describe("assembleGrowth", () => {
  it("computes the August 2026 production figures: -70.69% maps to tier 0", () => {
    const { growthPct, tier } = assembleGrowth(
      wei(4_346_787n),
      wei(1_273_995n),
      40,
    );
    expect(growthPct).toBe(-70.69);
    expect(tier).toBe(POOL_TIERS[0]);
  });

  it("maps an empty end set to growth 0 / tier 0 regardless of vpStart", () => {
    const { growthPct, tier } = assembleGrowth(wei(1_000n), wei(0n), 0);
    expect(growthPct).toBe(0);
    expect(tier).toBe(POOL_TIERS[0]);
  });

  it("selects the tier from positive growth", () => {
    const { growthPct, tier } = assembleGrowth(wei(1_000n), wei(1_155n), 40);
    expect(growthPct).toBe(15.5);
    expect(tier).toBe(POOL_TIERS[1]);
  });
});
