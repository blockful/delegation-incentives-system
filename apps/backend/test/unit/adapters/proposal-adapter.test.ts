import { describe, expect, it } from "vitest";
import { blockNumber } from "@ens-dis/domain";
import {
  createProposalAdapter,
  selectFinalizedProposalsBefore,
} from "../../../src/adapters/proposal-adapter.js";
import { FakePonderDb, type Row } from "../../doubles/fake-ponder-db.js";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeProposalRow(overrides: Partial<Row> & { id: string }): Row {
  return {
    proposer: "0x1111111111111111111111111111111111111111",
    startBlock: 1_000n,
    endBlock: 2_000n,
    timestamp: 1_700_000_000n,
    description: `Proposal ${overrides.id}`,
    status: "executed",
    finalizedTimestamp: 1_700_100_000n,
    ...overrides,
  };
}

function makeDb(rows: Row[]): FakePonderDb {
  return new FakePonderDb({ governance_proposal: rows });
}

// ─── selectFinalizedProposalsBefore ──────────────────────────────────────────

describe("selectFinalizedProposalsBefore", () => {
  it("selects by endBlock < beforeBlock, ignoring status-event timestamps", async () => {
    // A proposal whose voting ended before the cutoff but that was EXECUTED
    // long after it (finalizedTimestamp way in the future) must still be in
    // the window: finalization is the end of voting, not the status event.
    const rows = [
      makeProposalRow({
        id: "executed-late",
        endBlock: 100n,
        finalizedTimestamp: 9_999_999_999n, // executed after the cutoff
      }),
      makeProposalRow({ id: "executed-early", endBlock: 200n }),
    ];

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(1_000n),
      10,
    );

    expect(result.map((p) => p.id)).toEqual([
      "executed-early",
      "executed-late",
    ]);
  });

  it("regression: July-2026 round-1 window — mixed statuses, endBlock-descending order", async () => {
    // Encodes the production scenario checked against the DB: a mix of
    // executed proposals, one still-'active' proposal whose endBlock has
    // passed (implicitly defeated, finalizedTimestamp null — the old query
    // dated it at creation, moving it from position 4 to 3), one canceled,
    // and one whose voting had not ended at the cutoff.
    const cutoff = 25_600_000n; // ~ July 2026 month-end block

    const rows = [
      // 10 proposals with voting ended before the cutoff, seeded out of order
      makeProposalRow({ id: "p-7", endBlock: 25_100_000n }),
      makeProposalRow({ id: "p-1", endBlock: 25_550_000n }),
      makeProposalRow({ id: "p-5", endBlock: 25_300_000n }),
      // Still 'active' on-chain status, but voting ended -> implicitly
      // defeated; no finalizedTimestamp exists for it. Belongs at position 3.
      makeProposalRow({
        id: "454021796223",
        endBlock: 25_469_932n,
        status: "active",
        finalizedTimestamp: null,
      }),
      makeProposalRow({ id: "p-2", endBlock: 25_500_000n }),
      makeProposalRow({ id: "p-6", endBlock: 25_200_000n, status: "defeated" }),
      makeProposalRow({ id: "p-4", endBlock: 25_400_000n, status: "queued" }),
      makeProposalRow({ id: "p-8", endBlock: 25_050_000n }),
      makeProposalRow({ id: "p-9", endBlock: 25_020_000n, status: "succeeded" }),
      makeProposalRow({ id: "p-10", endBlock: 25_010_000n }),
      // Canceled before voting ended: excluded from the window.
      makeProposalRow({
        id: "p-canceled",
        endBlock: 25_450_000n,
        status: "canceled",
      }),
      // Voting had not ended at the cutoff: excluded from the window.
      makeProposalRow({ id: "p-future", endBlock: 25_700_000n, status: "active" }),
      // Older proposal pushed out by the 10-proposal limit.
      makeProposalRow({ id: "p-11", endBlock: 25_000_000n }),
    ];

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(cutoff),
      10,
    );

    // Exact membership and endBlock-descending order.
    expect(result.map((p) => p.id)).toEqual([
      "p-1",
      "p-2",
      "454021796223",
      "p-4",
      "p-5",
      "p-6",
      "p-7",
      "p-8",
      "p-9",
      "p-10",
    ]);
    // The implicitly finalized proposal sits at position 3 and keeps its raw
    // on-chain status label.
    expect(result[2].id).toBe("454021796223");
    expect(result[2].status).toBe("active");
    expect(result[2].endBlock).toBe(25_469_932n);
    // Neither the canceled nor the still-running proposal made the window.
    const ids = new Set(result.map((p) => p.id));
    expect(ids.has("p-canceled")).toBe(false);
    expect(ids.has("p-future")).toBe(false);
    expect(ids.has("p-11")).toBe(false);
  });

  it("excludes canceled proposals even when their voting period has passed", async () => {
    const rows = [
      makeProposalRow({ id: "kept", endBlock: 100n }),
      makeProposalRow({ id: "canceled", endBlock: 200n, status: "canceled" }),
    ];

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(1_000n),
      10,
    );

    expect(result.map((p) => p.id)).toEqual(["kept"]);
  });

  it("uses a strict bound: endBlock equal to beforeBlock is not finalized", async () => {
    const rows = [
      makeProposalRow({ id: "at-cutoff", endBlock: 500n }),
      makeProposalRow({ id: "before-cutoff", endBlock: 499n }),
    ];

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(500n),
      10,
    );

    expect(result.map((p) => p.id)).toEqual(["before-cutoff"]);
  });

  it("is point-in-time: an earlier cutoff yields the earlier window", async () => {
    const rows = [
      makeProposalRow({ id: "old", endBlock: 100n }),
      makeProposalRow({ id: "new", endBlock: 900n }),
    ];
    const db = makeDb(rows);

    const earlier = await selectFinalizedProposalsBefore(
      db as any,
      blockNumber(500n),
      10,
    );
    const later = await selectFinalizedProposalsBefore(
      db as any,
      blockNumber(1_000n),
      10,
    );

    expect(earlier.map((p) => p.id)).toEqual(["old"]);
    expect(later.map((p) => p.id)).toEqual(["new", "old"]);
  });

  it("caps the window at the given limit", async () => {
    const rows = Array.from({ length: 15 }, (_, i) =>
      makeProposalRow({ id: `p-${i}`, endBlock: BigInt(100 + i) }),
    );

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(1_000n),
      10,
    );

    expect(result).toHaveLength(10);
    // Highest endBlock first.
    expect(result[0].id).toBe("p-14");
    expect(result[9].id).toBe("p-5");
  });

  it("returns an empty window when no voting period has ended yet", async () => {
    const rows = [
      makeProposalRow({ id: "running", endBlock: 900n, status: "active" }),
    ];

    const result = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(500n),
      10,
    );

    expect(result).toEqual([]);
  });

  it("maps rows into domain Proposals with branded block numbers", async () => {
    const rows = [
      makeProposalRow({ id: "p-1", startBlock: 10n, endBlock: 20n }),
    ];

    const [proposal] = await selectFinalizedProposalsBefore(
      makeDb(rows) as any,
      blockNumber(100n),
      10,
    );

    expect(proposal).toEqual({
      id: "p-1",
      status: "executed",
      startBlock: 10n,
      endBlock: 20n,
    });
  });
});

// ─── createProposalAdapter ───────────────────────────────────────────────────

describe("createProposalAdapter.getFinalizedProposals", () => {
  it("delegates to the shared window query", async () => {
    const rows = [
      makeProposalRow({ id: "in-window", endBlock: 100n }),
      makeProposalRow({ id: "out-of-window", endBlock: 300n }),
    ];
    const adapter = createProposalAdapter(makeDb(rows) as any);

    const result = await adapter.getFinalizedProposals(blockNumber(200n), 10);

    expect(result.map((p) => p.id)).toEqual(["in-window"]);
  });
});
