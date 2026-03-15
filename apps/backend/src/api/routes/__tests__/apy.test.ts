import { describe, it, expect, vi, beforeEach } from "vitest"
import { apyRouter } from "../apy.js"
import { seconds, wei } from "@ens-dis/domain"

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

import { buildDataSource } from "../../data-source.js"

const DELEGATE_A = "0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
const DELEGATOR_B = "0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB"
const INELIGIBLE = "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"

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
      votingPower: wei(1000n * 10n ** 18n),
      timestamp: seconds(1000n),
    })),
  )

const mockDataSource = {
  proposals: { getRecentProposals: vi.fn() },
  votes: { getVotesForProposals: vi.fn() },
  delegations: {
    getAccountBalances: vi.fn(),
    getActiveDelegations: vi.fn().mockResolvedValue([]),
  },
  votingPower: {
    getAggregateDelegatedPower: vi.fn().mockResolvedValue(wei(1000n * 10n ** 18n)),
    getVotingPower: vi.fn(),
  },
  balances: {
    getBalanceHistory: vi.fn().mockResolvedValue([]),
    getBalanceAt: vi.fn().mockResolvedValue(wei(500n * 10n ** 18n)),
  },
}

beforeEach(() => {
  const proposals = makeProposals(10)
  const votes = makeVotes([DELEGATE_A], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
  vi.mocked(mockDataSource.delegations.getAccountBalances).mockResolvedValue([
    { accountId: DELEGATOR_B, balance: wei(500n * 10n ** 18n), delegate: DELEGATE_A },
  ])
  vi.mocked(mockDataSource.votingPower.getVotingPower).mockResolvedValue(
    new Map([[DELEGATE_A, wei(1000n * 10n ** 18n)]]),
  )
  vi.mocked(mockDataSource.delegations.getActiveDelegations).mockResolvedValue([
    { delegatorId: DELEGATOR_B, delegateId: DELEGATE_A, delegatedValue: wei(500n * 10n ** 18n), timestamp: seconds(1000n) },
  ])
})

describe("GET /apy/{address}", () => {
  it("returns 200 for ineligible address with role=ineligible and estimatedMonthlyRewardEns='0'", async () => {
    const req = new Request(`http://localhost/apy/${INELIGIBLE}`)
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe("ineligible")
    expect(body.estimatedMonthlyRewardEns).toBe("0")
    expect(body.estimatedApyPct).toBe("0")
    expect(body.address).toBe(INELIGIBLE)
  })

  it("returns 200 for active delegate with role=delegate", async () => {
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe("delegate")
    expect(body.delegatedTo).toBeNull()
    expect(typeof body.estimatedMonthlyRewardEns).toBe("string")
    expect(typeof body.estimatedApyPct).toBe("string")
    expect(typeof body.poolSizeEns).toBe("string")
  })

  it("returns 200 for delegator with role=delegator", async () => {
    const req = new Request(`http://localhost/apy/${DELEGATOR_B}`)
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe("delegator")
    expect(body.delegatedTo).toBe(DELEGATE_A)
    expect(typeof body.estimatedMonthlyRewardEns).toBe("string")
  })

  it("includes all required fields", async () => {
    const req = new Request(`http://localhost/apy/${INELIGIBLE}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body).toHaveProperty("address")
    expect(body).toHaveProperty("role")
    expect(body).toHaveProperty("delegatedTo")
    expect(body).toHaveProperty("poolSizeEns")
    expect(body).toHaveProperty("estimatedMonthlyRewardEns")
    expect(body).toHaveProperty("estimatedApyPct")
    expect(body).toHaveProperty("userShareWei")
    expect(body).toHaveProperty("totalShareWei")
    expect(body).toHaveProperty("currentBalanceEns")
  })
})
