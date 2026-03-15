import { describe, it, expect, beforeEach } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { ProposalAdapter } from "../ProposalAdapter.js"

const PROPOSALS = [
  { id: "1", status: "executed", timestamp: 1000n, endBlock: 100n, proposer: "0xaaa" },
  { id: "2", status: "defeated", timestamp: 2000n, endBlock: 200n, proposer: "0xbbb" },
  { id: "3", status: "active",   timestamp: 3000n, endBlock: 300n, proposer: "0xccc" },
  { id: "4", status: "canceled", timestamp: 4000n, endBlock: 400n, proposer: "0xddd" },
  { id: "5", status: "executed", timestamp: 500n,  endBlock: 50n,  proposer: "0xeee" },
]

describe("ProposalAdapter.getRecentProposals", () => {
  let db: FakePonderDb

  beforeEach(() => {
    db = new FakePonderDb({ governance_proposal: PROPOSALS })
  })

  it("returns N most recent concluded proposals ordered by timestamp DESC", async () => {
    const adapter = new ProposalAdapter(db)
    const results = await adapter.getRecentProposals(3)

    expect(results).toHaveLength(3)
    // Should be ordered by timestamp DESC: 4000, 2000, 1000
    expect(results[0].id).toBe("4")
    expect(results[1].id).toBe("2")
    expect(results[2].id).toBe("1")
  })

  it("excludes active proposals", async () => {
    const adapter = new ProposalAdapter(db)
    const results = await adapter.getRecentProposals(10)

    const ids = results.map((p) => p.id)
    expect(ids).not.toContain("3")
  })

  it("maps domain fields correctly", async () => {
    const adapter = new ProposalAdapter(db)
    const [first] = await adapter.getRecentProposals(1)

    expect(first.id).toBe("4")
    expect(first.status).toBe("canceled")
    expect(first.daoId).toBe("ens")
    expect(first.timestamp).toBe(4000n)
    expect(first.endBlock).toBe(400n)
  })

  it("returns empty array when no concluded proposals", async () => {
    const emptyDb = new FakePonderDb({
      governance_proposal: [
        { id: "1", status: "active", timestamp: 1000n, endBlock: 100n, proposer: "0xaaa" },
      ],
    })
    const adapter = new ProposalAdapter(emptyDb)
    const results = await adapter.getRecentProposals(5)
    expect(results).toHaveLength(0)
  })
})
