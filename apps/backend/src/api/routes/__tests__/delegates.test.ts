import { describe, it, expect, vi, beforeEach } from "vitest"
import { delegatesRouter } from "../delegates.js"
import { seconds, wei } from "@ens-dis/domain"

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

import { buildDataSource } from "../../data-source.js"

// Minimal proposals/votes that produce two active delegates
// (voted on at least 7 out of 10 proposals)
const makeProposals = (n: number) =>
  Array.from({ length: n }, (_, i) => ({
    id: `${i + 1}`,
    status: "executed",
    timestamp: seconds(BigInt(1000 + i)),
    endBlock: BigInt(2000 + i),
    daoId: "ens",
  }))

const makeVotes = (voterIds: string[], proposalIds: string[]) =>
  voterIds.flatMap((voter) =>
    proposalIds.map((proposalId) => ({
      voterAccountId: voter,
      proposalId,
      support: 1,
      votingPower: wei(100n),
      timestamp: seconds(1000n),
    })),
  )

const DELEGATE_A = "0xaaaa"
const DELEGATE_B = "0xbbbb"

const mockDataSource = {
  proposals: {
    getRecentProposals: vi.fn(),
  },
  votes: {
    getVotesForProposals: vi.fn(),
  },
}

beforeEach(() => {
  const proposals = makeProposals(10)
  const votes = makeVotes([DELEGATE_A, DELEGATE_B], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
})

describe("GET /delegates/active", () => {
  it("returns 200 with count and delegates array", async () => {
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.count).toBe("number")
    expect(Array.isArray(body.delegates)).toBe(true)
    expect(body.count).toBe(body.delegates.length)
  })

  it("returns active delegates who voted on all proposals", async () => {
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    expect(body.count).toBe(2)
    expect(body.delegates).toContain(DELEGATE_A)
    expect(body.delegates).toContain(DELEGATE_B)
  })

  it("returns 500 on error", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValue(
      new Error("DB failure"),
    )
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("DB failure")
  })
})
