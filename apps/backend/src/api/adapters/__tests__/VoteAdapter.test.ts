import { describe, it, expect, beforeEach } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { VoteAdapter } from "../VoteAdapter.js"

const VOTES = [
  { id: "p1-0xaaa", proposalId: "p1", voter: "0xAAA", support: 1, weight: "1000", timestamp: 100n },
  { id: "p1-0xbbb", proposalId: "p1", voter: "0xBBB", support: 0, weight: "2000", timestamp: 200n },
  { id: "p2-0xccc", proposalId: "p2", voter: "0xCCC", support: 2, weight: "3000", timestamp: 300n },
  { id: "p3-0xddd", proposalId: "p3", voter: "0xDDD", support: 1, weight: "4000", timestamp: 400n },
]

describe("VoteAdapter.getVotesForProposals", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ governance_vote: VOTES })
  })

  it("returns votes for a single proposal", async () => {
    const adapter = new VoteAdapter(db)
    const results = await adapter.getVotesForProposals(["p1"])

    expect(results).toHaveLength(2)
    const voterIds = results.map((v) => v.voterAccountId)
    expect(voterIds).toContain("0xaaa")
    expect(voterIds).toContain("0xbbb")
  })

  it("returns votes from multiple proposals when multiple IDs given", async () => {
    const adapter = new VoteAdapter(db)
    const results = await adapter.getVotesForProposals(["p1", "p3"])

    expect(results).toHaveLength(3)
    const proposalIds = results.map((v) => v.proposalId)
    expect(proposalIds).toContain("p1")
    expect(proposalIds).toContain("p3")
    expect(proposalIds).not.toContain("p2")
  })

  it("returns empty array for unknown proposal IDs", async () => {
    const adapter = new VoteAdapter(db)
    const results = await adapter.getVotesForProposals(["unknown"])

    expect(results).toHaveLength(0)
  })

  it("normalizes voter address to lowercase", async () => {
    const adapter = new VoteAdapter(db)
    const [vote] = await adapter.getVotesForProposals(["p1"])
    expect(vote.voterAccountId).toBe(vote.voterAccountId.toLowerCase())
  })

  it("converts weight string to Wei (bigint)", async () => {
    const adapter = new VoteAdapter(db)
    const [vote] = await adapter.getVotesForProposals(["p2"])
    expect(vote.votingPower).toBe(3000n)
  })
})
