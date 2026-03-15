import { describe, it, expect, vi, beforeEach } from "vitest"
import { delegatesRouter } from "../delegates.js"
import { seconds, wei } from "@ens-dis/domain"

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

import { buildDataSource } from "../../data-source.js"

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

// Mixed-case addresses matching real indexer output
const DELEGATE_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
const DELEGATE_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"

// Adapters normalize to lowercase — this is what real data sources return
const DELEGATE_A_LC = DELEGATE_A.toLowerCase()
const DELEGATE_B_LC = DELEGATE_B.toLowerCase()

const mockDataSource = {
  proposals: {
    getRecentProposals: vi.fn(),
  },
  votes: {
    getVotesForProposals: vi.fn(),
    getEarliestVoteTimestamps: vi.fn(),
  },
  votingPower: {
    // getVotingPower returns a lowercase-keyed map (matches VotingPowerAdapter)
    getVotingPower: vi.fn().mockResolvedValue(
      new Map([
        [DELEGATE_A_LC, wei(500n * 10n ** 18n)],
        [DELEGATE_B_LC, wei(300n * 10n ** 18n)],
      ]),
    ),
  },
  delegations: {
    // getActiveDelegations returns { delegatorId, delegateId } — matches Delegation interface
    // delegateId is lowercased (matches DelegationAdapter)
    getActiveDelegations: vi.fn().mockResolvedValue([
      { delegatorId: "0x1111", delegateId: DELEGATE_A_LC, delegatedValue: wei(100n), timestamp: seconds(1000n) },
      { delegatorId: "0x2222", delegateId: DELEGATE_A_LC, delegatedValue: wei(100n), timestamp: seconds(1000n) },
      { delegatorId: "0x3333", delegateId: DELEGATE_B_LC, delegatedValue: wei(100n), timestamp: seconds(1000n) },
    ]),
  },
}

beforeEach(() => {
  const proposals = makeProposals(10)
  const votes = makeVotes([DELEGATE_A, DELEGATE_B], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
  vi.mocked(mockDataSource.votes.getEarliestVoteTimestamps).mockResolvedValue(
    new Map([
      [DELEGATE_A_LC, seconds(1000n)],
      [DELEGATE_B_LC, seconds(2000n)],
    ]),
  )
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
    expect(body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)).toBeDefined()
    expect(body.delegates.find((d: { address: string }) => d.address === DELEGATE_B)).toBeDefined()
  })

  it("returns delegate objects with address and votingPower", async () => {
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    expect(delegateA).toBeDefined()
    expect(typeof delegateA.votingPower).toBe("string")
    // activeSince reflects the historical first vote, not window-limited
    expect(typeof delegateA.activeSince).toBe("string")
    expect(new Date(delegateA.activeSince).toISOString()).toBe(delegateA.activeSince)
  })

  it("activeSince is the ISO date of the delegate's earliest vote", async () => {
    // A voted first at t=501, B voted first at t=801 — from getEarliestVoteTimestamps
    vi.mocked(mockDataSource.votes.getEarliestVoteTimestamps).mockResolvedValueOnce(
      new Map([
        [DELEGATE_A_LC, seconds(501n)],
        [DELEGATE_B_LC, seconds(801n)],
      ]),
    )

    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()

    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    const delegateB = body.delegates.find((d: { address: string }) => d.address === DELEGATE_B)

    expect(delegateA.activeSince).toBe(new Date(501 * 1000).toISOString())
    expect(delegateB.activeSince).toBe(new Date(801 * 1000).toISOString())
    expect(new Date(delegateA.activeSince).getTime()).toBeLessThan(new Date(delegateB.activeSince).getTime())
  })

  it("activeSince is null when the delegate has no recorded votes", async () => {
    vi.mocked(mockDataSource.votes.getEarliestVoteTimestamps).mockResolvedValueOnce(new Map())
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    expect(delegateA.activeSince).toBeNull()
  })

  it("votingPower is populated even when addresses are mixed-case", async () => {
    // VotingPowerAdapter returns lowercase-keyed map; route must normalize to match
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    // Must not be null — fails when address case doesn't match map key
    expect(delegateA.votingPower).not.toBeNull()
    expect(delegateA.votingPower).toBe(wei(500n * 10n ** 18n).toString())
  })

  it("returns delegatorCount per delegate using delegateId field", async () => {
    // Bug: route was using d.delegate (undefined on real Delegation objects) instead of d.delegateId
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    const delegateB = body.delegates.find((d: { address: string }) => d.address === DELEGATE_B)
    expect(delegateA.delegatorCount).toBe(2)
    expect(delegateB.delegatorCount).toBe(1)
  })

  it("delegatorCount uses case-insensitive matching (adapter lowercases, voter IDs may be mixed-case)", async () => {
    // DelegationAdapter lowercases delegateId; activeDelegates uses original-case voter IDs.
    // delegatorCountMap.get(address) must find the count even when address is mixed-case.
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    expect(delegateA.delegatorCount).not.toBeNull()
    expect(delegateA.delegatorCount).toBe(2)
  })

  it("delegates with no delegators get delegatorCount of 0, not null", async () => {
    vi.mocked(mockDataSource.delegations.getActiveDelegations).mockResolvedValueOnce([])
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    // No delegations → 0, not null
    expect(delegateA.delegatorCount).toBe(0)
  })

  it("returns last10ProposalsVoted as array of booleans", async () => {
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    expect(Array.isArray(delegateA.last10ProposalsVoted)).toBe(true)
    expect(delegateA.last10ProposalsVoted).toHaveLength(10)
    expect(delegateA.last10ProposalsVoted.every((v: boolean) => v === true)).toBe(true)
  })

  it("last10ProposalsVoted is false for proposals the delegate did not vote on", async () => {
    const proposals = makeProposals(10)
    // DELEGATE_A only votes on first 7 proposals, misses last 3
    const votes = [
      ...makeVotes([DELEGATE_A], proposals.slice(0, 7).map((p) => p.id)),
      ...makeVotes([DELEGATE_B], proposals.map((p) => p.id)),
    ]
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
    vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)

    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    const body = await res.json()
    const delegateA = body.delegates.find((d: { address: string }) => d.address === DELEGATE_A)
    expect(delegateA.last10ProposalsVoted).toHaveLength(10)
    const votedCount = delegateA.last10ProposalsVoted.filter(Boolean).length
    expect(votedCount).toBe(7)
  })

  it("returns 500 on error", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValue(
      new Error("DB failure"),
    )
    const req = new Request("http://localhost/delegates/active")
    const res = await delegatesRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("Internal server error")
  })
})
