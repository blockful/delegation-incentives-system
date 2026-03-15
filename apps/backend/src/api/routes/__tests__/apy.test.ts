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
  it("returns 400 for invalid address", async () => {
    const req = new Request("http://localhost/apy/not-an-address")
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(400)
  })


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

  it("returns 500 when data source throws", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })

  it("caps delegate reward at per-delegate cap (1% of pool) per spec", async () => {
    // Delegate has 100% of VP → uncapped reward would be full delegate pool
    // Per spec: delegate cap = 1% of monthly pool
    vi.mocked(mockDataSource.votingPower.getVotingPower).mockResolvedValue(
      new Map([[DELEGATE_A, wei(10_000n * 10n ** 18n)]]),
    )
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.role).toBe("delegate")
    // Estimated reward must not exceed the delegate cap string representation
    const reward = parseFloat(body.estimatedMonthlyRewardEns)
    // Tier 0: pool = 5000 ENS, delegate pool = 10% = 500 ENS, cap = 1% of 5000 = 50 ENS
    expect(reward).toBeLessThanOrEqual(50)
  })

  it("does not cap delegate reward when estimated reward is below delegate cap", async () => {
    // DELEGATE_A has 5% of total VP → reward = 5% * delegatePool < delegateCap
    // tier 0: delegatePool = 10% of 5000 = 500 ENS, delegateCap = 50 ENS
    // 5% of 500 = 25 ENS < 50 ENS cap → uncapped path taken
    vi.mocked(mockDataSource.votingPower.getVotingPower).mockResolvedValueOnce(
      new Map([
        [DELEGATE_A, wei(1000n * 10n ** 18n)],
        ["0xother111111111111111111111111111111111111", wei(19000n * 10n ** 18n)],
      ]),
    )
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("delegate")
    const reward = parseFloat(body.estimatedMonthlyRewardEns)
    expect(reward).toBeGreaterThan(0)
    expect(reward).toBeLessThan(50) // below cap, so uncapped branch was taken
  })

  it("returns zero estimate when VP map is empty (totalVP=0 guard)", async () => {
    vi.mocked(mockDataSource.votingPower.getVotingPower).mockResolvedValueOnce(new Map())
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("delegate")
    expect(body.estimatedMonthlyRewardEns).toBe("0.0000")
  })

  it("finds delegate VP via lowercase key fallback when map uses lowercase keys", async () => {
    // Real adapters lowercase addresses; route tries address then address.toLowerCase()
    vi.mocked(mockDataSource.votingPower.getVotingPower).mockResolvedValueOnce(
      new Map([[DELEGATE_A.toLowerCase(), wei(1000n * 10n ** 18n)]]),
    )
    const req = new Request(`http://localhost/apy/${DELEGATE_A}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("delegate")
    // VP found via lowercase fallback → non-zero reward
    expect(body.userShareWei).toBe(wei(1000n * 10n ** 18n).toString())
  })

  it("ineligible address with accountBalance shows delegatedTo the (inactive) delegate", async () => {
    // Address has an accountBalance but delegate is not in activeDelegates → ineligible
    // Covers accountBalance?.delegate ?? null when accountBalance is defined
    const INACTIVE = "0xDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDD"
    vi.mocked(mockDataSource.delegations.getAccountBalances).mockResolvedValueOnce([
      { accountId: INELIGIBLE, balance: wei(100n * 10n ** 18n), delegate: INACTIVE },
    ])
    const req = new Request(`http://localhost/apy/${INELIGIBLE}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("ineligible")
    expect(body.delegatedTo).toBe(INACTIVE)
  })

  it("returns zero estimate for delegator when totalTWB is zero", async () => {
    // All balances are 0 → userTWB = 0, totalTWB = 0 → estimatedReward = 0n guard
    vi.mocked(mockDataSource.balances.getBalanceAt).mockResolvedValue(wei(0n))
    const req = new Request(`http://localhost/apy/${DELEGATOR_B}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("delegator")
    expect(body.estimatedMonthlyRewardEns).toBe("0.0000")
  })

  it("does not cap delegator reward when estimated reward is below delegator cap", async () => {
    // DELEGATOR_B has tiny TWB, another delegator has large TWB → B's reward < delegatorCap
    // tier 0: delegatorPool = 90% of 5000 = 4500 ENS, delegatorCap = 250 ENS
    const OTHER_DELEGATOR = "0xEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEE"
    vi.mocked(mockDataSource.delegations.getActiveDelegations).mockResolvedValueOnce([
      { delegatorId: DELEGATOR_B, delegateId: DELEGATE_A, delegatedValue: wei(1n), timestamp: seconds(1000n) },
      { delegatorId: OTHER_DELEGATOR, delegateId: DELEGATE_A, delegatedValue: wei(1000n * 10n ** 18n), timestamp: seconds(1000n) },
    ])
    // Sequence of getBalanceAt calls:
    // 1. getBalanceAt(DELEGATOR_B, twbWindowStart) → for userTWB
    // 2. getBalanceAt(DELEGATOR_B, monthEnd) → for currentBalance display
    // 3. getBalanceAt(DELEGATOR_B, twbWindowStart) → for totalTWB contribution (first delegator)
    // 4. getBalanceAt(OTHER_DELEGATOR, twbWindowStart) → for totalTWB (second delegator)
    vi.mocked(mockDataSource.balances.getBalanceAt)
      .mockResolvedValueOnce(wei(1n))                       // DELEGATOR_B initial (userTWB)
      .mockResolvedValueOnce(wei(1n))                       // DELEGATOR_B current (display)
      .mockResolvedValueOnce(wei(1n))                       // DELEGATOR_B initial (totalTWB)
      .mockResolvedValueOnce(wei(1000n * 10n ** 18n))       // OTHER_DELEGATOR initial (totalTWB)
    const req = new Request(`http://localhost/apy/${DELEGATOR_B}`)
    const res = await apyRouter.fetch(req)
    const body = await res.json()
    expect(body.role).toBe("delegator")
    const reward = parseFloat(body.estimatedMonthlyRewardEns)
    // userTWB ≈ 0, totalTWB ≈ 1000 ENS → reward ≈ 0 < delegatorCap → uncapped branch taken
    expect(reward).toBeGreaterThanOrEqual(0)
    expect(reward).toBeLessThan(250) // below delegatorCap
  })
})
