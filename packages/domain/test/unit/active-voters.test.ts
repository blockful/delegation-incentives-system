import { describe, it, expect } from "vitest";
import {
  getLastFinalizedProposals,
  identifyActiveVoters,
} from "../../src/active-voters.js";
import type { Address, Proposal, Vote } from "../../src/types.js";
import {
  FINALIZED_STATUSES,
  seconds,
  wei,
  blockNumber,
} from "../../src/types.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeProposal(id: string, ts: number): Proposal {
  return {
    id,
    status: "executed",
    finalizedTimestamp: seconds(BigInt(ts)),
    startBlock: blockNumber(100n),
    endBlock: blockNumber(200n),
  };
}

function makeVote(voter: Address, proposalId: string): Vote {
  return {
    voter,
    proposalId,
    support: 1,
    weight: wei(1_000_000_000_000_000_000n),
    timestamp: seconds(1_000_000n),
  };
}

// ---------------------------------------------------------------------------
// getLastFinalizedProposals
// ---------------------------------------------------------------------------
describe("getLastFinalizedProposals", () => {
  it("excludes canceled proposals from finalized activity statuses", () => {
    expect(FINALIZED_STATUSES.has("canceled")).toBe(false);
    expect(FINALIZED_STATUSES.has("succeeded")).toBe(true);
    expect(FINALIZED_STATUSES.has("queued")).toBe(true);
    expect(FINALIZED_STATUSES.has("executed")).toBe(true);
    expect(FINALIZED_STATUSES.has("defeated")).toBe(true);
    expect(FINALIZED_STATUSES.has("expired")).toBe(true);
  });

  it("sorts proposals by finalizedTimestamp descending", () => {
    const proposals = [
      makeProposal("p1", 100),
      makeProposal("p2", 300),
      makeProposal("p3", 200),
    ];

    const result = getLastFinalizedProposals(proposals);
    expect(result.map((p) => p.id)).toEqual(["p2", "p3", "p1"]);
  });

  it("limits to the specified number of proposals", () => {
    const proposals = Array.from({ length: 15 }, (_, i) =>
      makeProposal(`p${i}`, (i + 1) * 100),
    );

    const result = getLastFinalizedProposals(proposals, 10);
    expect(result).toHaveLength(10);
    // Most recent first (p14 at ts 1500 down to p5 at ts 600)
    expect(result[0].id).toBe("p14");
    expect(result[9].id).toBe("p5");
  });

  it("returns all proposals when fewer than limit", () => {
    const proposals = [makeProposal("p1", 100), makeProposal("p2", 200)];
    const result = getLastFinalizedProposals(proposals, 10);
    expect(result).toHaveLength(2);
  });

  it("returns empty array for empty input", () => {
    const result = getLastFinalizedProposals([]);
    expect(result).toEqual([]);
  });

  it("uses PROPOSAL_WINDOW_SIZE (10) as default limit", () => {
    const proposals = Array.from({ length: 20 }, (_, i) =>
      makeProposal(`p${i}`, (i + 1) * 100),
    );

    const result = getLastFinalizedProposals(proposals);
    expect(result).toHaveLength(10);
  });

  it("does not mutate the input array", () => {
    const proposals = [
      makeProposal("p1", 300),
      makeProposal("p2", 100),
      makeProposal("p3", 200),
    ];
    const original = [...proposals];

    getLastFinalizedProposals(proposals);
    expect(proposals.map((p) => p.id)).toEqual(original.map((p) => p.id));
  });
});

// ---------------------------------------------------------------------------
// identifyActiveVoters
// ---------------------------------------------------------------------------
describe("identifyActiveVoters", () => {
  const proposals = Array.from({ length: 10 }, (_, i) =>
    makeProposal(`p${i}`, (i + 1) * 100),
  );

  const alice: Address = "0xAlice0000000000000000000000000000000001";
  const bob: Address = "0xBob00000000000000000000000000000000000002";
  const carol: Address = "0xCarol000000000000000000000000000000000003";

  it("voter who voted on all 10 proposals is active", () => {
    const votes = proposals.map((p) => makeVote(alice, p.id));

    const active = identifyActiveVoters(proposals, votes);
    expect(active.has(alice)).toBe(true);
    expect(active.size).toBe(1);
  });

  it("voter who voted on exactly 7 proposals is active", () => {
    const votes = proposals.slice(0, 7).map((p) => makeVote(alice, p.id));

    const active = identifyActiveVoters(proposals, votes);
    expect(active.has(alice)).toBe(true);
  });

  it("voter who voted on 6 proposals is not active", () => {
    const votes = proposals.slice(0, 6).map((p) => makeVote(alice, p.id));

    const active = identifyActiveVoters(proposals, votes);
    expect(active.has(alice)).toBe(false);
    expect(active.size).toBe(0);
  });

  it("fewer than 10 proposals (e.g. 5) — no one can reach threshold of 7", () => {
    const fiveProposals = proposals.slice(0, 5);
    const votes = fiveProposals.map((p) => makeVote(alice, p.id));

    const active = identifyActiveVoters(fiveProposals, votes);
    expect(active.size).toBe(0);
  });

  it("multiple voters with different vote counts", () => {
    const votes = [
      // Alice votes on all 10
      ...proposals.map((p) => makeVote(alice, p.id)),
      // Bob votes on 7
      ...proposals.slice(0, 7).map((p) => makeVote(bob, p.id)),
      // Carol votes on 3
      ...proposals.slice(0, 3).map((p) => makeVote(carol, p.id)),
    ];

    const active = identifyActiveVoters(proposals, votes);
    expect(active.has(alice)).toBe(true);
    expect(active.has(bob)).toBe(true);
    expect(active.has(carol)).toBe(false);
    expect(active.size).toBe(2);
  });

  it("empty votes returns no active voters", () => {
    const active = identifyActiveVoters(proposals, []);
    expect(active.size).toBe(0);
  });

  it("ignores votes on proposals not in the given set", () => {
    const votes = [
      ...proposals.slice(0, 6).map((p) => makeVote(alice, p.id)),
      // These votes are for proposals not in the list
      makeVote(alice, "unknown-1"),
      makeVote(alice, "unknown-2"),
      makeVote(alice, "unknown-3"),
    ];

    const active = identifyActiveVoters(proposals, votes);
    expect(active.has(alice)).toBe(false);
  });

  it("duplicate votes on the same proposal count once", () => {
    const votes = [
      // Alice votes on 6 distinct proposals
      ...proposals.slice(0, 6).map((p) => makeVote(alice, p.id)),
      // Plus duplicate votes on those same 6 proposals
      ...proposals.slice(0, 6).map((p) => makeVote(alice, p.id)),
    ];

    const active = identifyActiveVoters(proposals, votes);
    // Still only 6 distinct proposals — not active
    expect(active.has(alice)).toBe(false);
  });

  it("respects a custom threshold", () => {
    const votes = proposals.slice(0, 3).map((p) => makeVote(alice, p.id));

    const active = identifyActiveVoters(proposals, votes, 3);
    expect(active.has(alice)).toBe(true);
  });
});
