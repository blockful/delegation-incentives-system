import { describe, it, expect } from "vitest";
import { identifyActiveDelegates } from "@/active-delegates.js";
import { type Proposal, type Vote, wei, seconds } from "@/types.js";

function makeProposal(id: string, timestamp: number): Proposal {
  return {
    id,
    status: "executed",
    timestamp: seconds(BigInt(timestamp)),
    endBlock: BigInt(timestamp + 7 * 86400),
    daoId: "ens",
  };
}

function makeVote(voter: string, proposalId: string): Vote {
  return {
    voterAccountId: voter,
    proposalId,
    support: 1,
    votingPower: wei(100n * 10n ** 18n),
    timestamp: seconds(0n),
  };
}

// Generate 10 proposals with increasing timestamps
const proposals = Array.from({ length: 10 }, (_, i) =>
  makeProposal(`prop-${i}`, 1000000 + i * 100000),
);

describe("identifyActiveDelegates", () => {
  it("marks delegate as active if voted on 7 of 10 proposals", () => {
    const votes = Array.from({ length: 7 }, (_, i) =>
      makeVote("alice", `prop-${i}`),
    );
    const result = identifyActiveDelegates(proposals, votes);
    expect(result.has("alice")).toBe(true);
  });

  it("marks delegate as NOT active if voted on 6 of 10 proposals", () => {
    const votes = Array.from({ length: 6 }, (_, i) =>
      makeVote("alice", `prop-${i}`),
    );
    const result = identifyActiveDelegates(proposals, votes);
    expect(result.has("alice")).toBe(false);
  });

  it("marks delegate as active if voted on all 10 proposals", () => {
    const votes = Array.from({ length: 10 }, (_, i) =>
      makeVote("alice", `prop-${i}`),
    );
    const result = identifyActiveDelegates(proposals, votes);
    expect(result.has("alice")).toBe(true);
  });

  it("handles multiple delegates independently", () => {
    const votes = [
      ...Array.from({ length: 7 }, (_, i) => makeVote("alice", `prop-${i}`)),
      ...Array.from({ length: 6 }, (_, i) => makeVote("bob", `prop-${i}`)),
      ...Array.from({ length: 8 }, (_, i) => makeVote("carol", `prop-${i}`)),
    ];
    const result = identifyActiveDelegates(proposals, votes);
    expect(result.has("alice")).toBe(true);
    expect(result.has("bob")).toBe(false);
    expect(result.has("carol")).toBe(true);
  });

  it("only considers the last 10 proposals by timestamp", () => {
    const manyProposals = Array.from({ length: 15 }, (_, i) =>
      makeProposal(`prop-${i}`, 1000000 + i * 100000),
    );
    // Alice only voted on the first 7 (old ones, not in last 10)
    const votes = Array.from({ length: 7 }, (_, i) =>
      makeVote("alice", `prop-${i}`),
    );
    const result = identifyActiveDelegates(manyProposals, votes);
    // Last 10 are prop-5 through prop-14, alice voted on prop-0 to prop-6
    // Only prop-5 and prop-6 are in the last 10, so 2/10 → not active
    expect(result.has("alice")).toBe(false);
  });

  it("handles fewer than 10 proposals", () => {
    const fewProposals = proposals.slice(0, 5); // only 5 proposals
    // Voted on all 5 — but threshold is still 7, so not enough
    const votes = Array.from({ length: 5 }, (_, i) =>
      makeVote("alice", `prop-${i}`),
    );
    const result = identifyActiveDelegates(fewProposals, votes);
    // With only 5 proposals, max possible is 5 < 7 threshold
    expect(result.has("alice")).toBe(false);
  });

  it("ignores duplicate votes on same proposal", () => {
    const votes = [
      makeVote("alice", "prop-0"),
      makeVote("alice", "prop-0"), // duplicate
      ...Array.from({ length: 6 }, (_, i) =>
        makeVote("alice", `prop-${i + 1}`),
      ),
    ];
    const result = identifyActiveDelegates(proposals, votes);
    // 7 unique proposals voted → active
    expect(result.has("alice")).toBe(true);
  });

  it("returns empty set when no votes", () => {
    const result = identifyActiveDelegates(proposals, []);
    expect(result.size).toBe(0);
  });

  it("returns empty set when no proposals", () => {
    const votes = [makeVote("alice", "prop-0")];
    const result = identifyActiveDelegates([], votes);
    expect(result.size).toBe(0);
  });

  it("self-delegation is eligible (no special treatment for self-delegates)", () => {
    const votes = Array.from({ length: 7 }, (_, i) =>
      makeVote("self-delegator", `prop-${i}`),
    );
    const result = identifyActiveDelegates(proposals, votes);
    expect(result.has("self-delegator")).toBe(true);
  });
});
