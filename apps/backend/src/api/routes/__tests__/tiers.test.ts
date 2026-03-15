import { describe, it, expect, vi, beforeEach } from "vitest"
import { tiersRouter } from "../tiers.js"
import { seconds, wei, POOL_TIERS } from "@ens-dis/domain"

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

const mockDataSource = {
  proposals: { getRecentProposals: vi.fn() },
  votes: { getVotesForProposals: vi.fn() },
  votingPower: {
    // Both current and previous AVP return the same value (0% growth → tier 0)
    getAggregateDelegatedPower: vi.fn().mockResolvedValue(wei(1000n * 10n ** 18n)),
  },
}

beforeEach(() => {
  const proposals = makeProposals(10)
  const votes = makeVotes(["0xaaa"], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
  vi.mocked(mockDataSource.votingPower.getAggregateDelegatedPower).mockResolvedValue(
    wei(1000n * 10n ** 18n),
  )
})

describe("GET /tiers/progression", () => {
  it("returns 200 with exactly 7 tiers", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.tiers).toHaveLength(POOL_TIERS.length)
    expect(body.tiers).toHaveLength(7)
  })

  it("has exactly one isCurrent tier", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    const currentTiers = body.tiers.filter((t: any) => t.isCurrent)
    expect(currentTiers).toHaveLength(1)
  })

  it("returns currentAVP and previousAVP as strings", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(typeof body.currentAVP).toBe("string")
    expect(typeof body.previousAVP).toBe("string")
    expect(typeof body.currentGrowthBps).toBe("string")
    expect(typeof body.currentGrowthPct).toBe("string")
    expect(typeof body.currentTierIndex).toBe("number")
    expect(typeof body.activeDelegateCount).toBe("number")
  })

  it("returns maxDelegatorApyPct based on current AVP", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(typeof body.maxDelegatorApyPct).toBe("string")
    // currentAVP = 1000 ENS, tier 0 poolSize = 5000, delegatorPoolBps = 9000:
    // delegatorPool = 5000 * 9000 / 10000 = 4500 ENS
    // maxDelegatorApyPct = (4500 * 12 / 1000) * 100 = 5400.00
    expect(body.maxDelegatorApyPct).toBe("5400.00")
  })

  it("returns maxDelegatorApyPct of 0.00 when AVP is zero", async () => {
    vi.mocked(mockDataSource.votingPower.getAggregateDelegatedPower).mockResolvedValue(
      wei(0n),
    )
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(body.maxDelegatorApyPct).toBe("0.00")
  })

  it("each tier has estimatedApyPct based on previousAVP and tier growth", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()

    for (const tier of body.tiers) {
      expect(typeof tier.estimatedApyPct).toBe("string")
      expect(parseFloat(tier.estimatedApyPct)).toBeGreaterThanOrEqual(0)
    }

    // Tier 0: growth = 0%, estimatedVP = previousAVP * 1.0 = 1000 ENS
    // pool = 5000, delegatorPool = 4500, APY = (4500 * 12 / 1000) * 100 = 5400.00
    expect(body.tiers[0].estimatedApyPct).toBe("5400.00")

    // Higher tiers should have lower APY per unit (bigger pool but bigger denominator)
    // but pool grows faster than VP, so APY should generally increase
  })

  it("each tier has required fields", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    for (const tier of body.tiers) {
      expect(typeof tier.index).toBe("number")
      expect(typeof tier.momGrowthMinPct).toBe("string")
      expect(typeof tier.momGrowthMaxPct).toBe("string")
      expect(typeof tier.poolSizeEns).toBe("string")
      expect(typeof tier.delegateCapEns).toBe("string")
      expect(typeof tier.delegatorCapEns).toBe("string")
      expect(typeof tier.isCurrent).toBe("boolean")
      expect(typeof tier.isUnlocked).toBe("boolean")
      expect(typeof tier.additionalVPNeeded).toBe("string")
      expect(typeof tier.requiredAVP).toBe("string")
      expect(typeof tier.estimatedApyPct).toBe("string")
    }
  })

  it("returns tier 0 with zero AVP when there are no active delegates", async () => {
    // No votes → no active delegates → activeDelegateArray.length === 0
    // fetchMonthContext short-circuits to [wei(0n), wei(0n)] → bootstrap guard → tier 0
    vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValueOnce([])
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.currentTierIndex).toBe(0)
    expect(body.currentAVP).toBe("0")
    expect(body.previousAVP).toBe("0")
    expect(body.activeDelegateCount).toBe(0)
  })

  it("returns 500 when data source throws", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })

  it("selects tier 0 when previousAVP is zero (bootstrap guard per spec: first program month)", async () => {
    // Per spec: first month has no previous month to compare; implementation uses tier 0 as guard
    vi.mocked(mockDataSource.votingPower.getAggregateDelegatedPower)
      .mockResolvedValueOnce(wei(5000n * 10n ** 18n)) // currentAVP
      .mockResolvedValueOnce(wei(0n))                  // previousAVP = 0 → bootstrap guard
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(body.currentTierIndex).toBe(0)
    expect(body.tiers[0].isCurrent).toBe(true)
  })

  it("per spec: delegate cap is 1% of monthly pool size", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    // Tier 0: pool = 5000 ENS, delegate cap = 1% = 50 ENS
    expect(body.tiers[0].poolSizeEns).toBe("5000")
    expect(body.tiers[0].delegateCapEns).toBe("50")
  })

  it("per spec: delegator cap is 5% of monthly pool size", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    // Tier 0: pool = 5000 ENS, delegator cap = 5% = 250 ENS
    expect(body.tiers[0].delegatorCapEns).toBe("250")
  })
})
