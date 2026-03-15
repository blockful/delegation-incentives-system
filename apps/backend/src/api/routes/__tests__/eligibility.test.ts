import { describe, it, expect, vi, beforeEach } from "vitest"
import { eligibilityRouter } from "../eligibility.js"
import { seconds, wei } from "@ens-dis/domain"

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

vi.mock("../../ens-cache.js", () => ({
  getCachedEnsName: vi.fn((address: string) => {
    if (address === "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA") return "delegate.eth"
    return null
  }),
  prefetchEnsNames: vi.fn(() => Promise.resolve()),
}))

import { buildDataSource } from "../../data-source.js"

const DELEGATE_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
const DELEGATOR_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
const UNKNOWN = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"

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

const mockDataSource = {
  proposals: { getRecentProposals: vi.fn() },
  votes: { getVotesForProposals: vi.fn() },
  delegations: { getAccountBalances: vi.fn() },
}

beforeEach(() => {
  const proposals = makeProposals(10)
  const votes = makeVotes([DELEGATE_A], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
  vi.mocked(mockDataSource.delegations.getAccountBalances).mockResolvedValue([
    { accountId: DELEGATOR_B, balance: wei(500n), delegate: DELEGATE_A },
  ])
})

describe("GET /eligibility/{address}", () => {
  it("returns 400 for invalid address", async () => {
    const req = new Request("http://localhost/eligibility/not-an-address")
    const res = await eligibilityRouter.fetch(req)
    expect(res.status).toBe(400)
  })


  it("returns eligible=true for active delegate", async () => {
    const req = new Request(`http://localhost/eligibility/${DELEGATE_A}`)
    const res = await eligibilityRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligible).toBe(true)
    expect(body.isActiveDelegate).toBe(true)
    expect(body.isDelegatorToActiveDelegate).toBe(false)
    expect(body.address).toBe(DELEGATE_A)
    expect(body.ensName).toBe("delegate.eth")
    expect(body.delegatedToEnsName).toBeNull()
  })

  it("returns eligible=true for delegator to active delegate", async () => {
    const req = new Request(`http://localhost/eligibility/${DELEGATOR_B}`)
    const res = await eligibilityRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligible).toBe(true)
    expect(body.isActiveDelegate).toBe(false)
    expect(body.isDelegatorToActiveDelegate).toBe(true)
    expect(body.delegatedTo).toBe(DELEGATE_A)
    expect(body.ensName).toBeNull()
    expect(body.delegatedToEnsName).toBe("delegate.eth")
  })

  it("returns eligible=false for unknown address (200 not 404)", async () => {
    const req = new Request(`http://localhost/eligibility/${UNKNOWN}`)
    const res = await eligibilityRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.eligible).toBe(false)
    expect(body.isActiveDelegate).toBe(false)
    expect(body.isDelegatorToActiveDelegate).toBe(false)
    expect(body.delegatedTo).toBeNull()
  })

  it("returns 500 when data source throws", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request(`http://localhost/eligibility/${DELEGATE_A}`)
    const res = await eligibilityRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })

  it("per spec: address delegated to inactive delegate is not eligible", async () => {
    // Spec: delegators earn only when delegated to an *active* delegate
    // An inactive delegate is one who hasn't voted 7/10 recent proposals
    const INACTIVE_DELEGATE = "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
    vi.mocked(mockDataSource.delegations.getAccountBalances).mockResolvedValue([
      { accountId: DELEGATOR_B, balance: wei(500n), delegate: INACTIVE_DELEGATE },
    ])
    const req = new Request(`http://localhost/eligibility/${DELEGATOR_B}`)
    const res = await eligibilityRouter.fetch(req)
    const body = await res.json()
    expect(body.eligible).toBe(false)
    expect(body.isDelegatorToActiveDelegate).toBe(false)
    expect(body.delegatedTo).toBe(INACTIVE_DELEGATE)
  })
})
