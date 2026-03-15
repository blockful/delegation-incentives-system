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
    getAggregateDelegatedPower: vi.fn().mockResolvedValue(wei(1000n * 10n ** 18n)),
  },
  delegations: {
    getAccountBalances: vi.fn().mockResolvedValue([
      { accountId: "0x1111", balance: wei(500n * 10n ** 18n), delegate: "0xaaa" },
      { accountId: "0x2222", balance: wei(300n * 10n ** 18n), delegate: "0xaaa" },
      { accountId: "0x3333", balance: wei(200n * 10n ** 18n), delegate: "0xbbb" }, // not active
    ]),
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

  it("returns maxDelegatorApyPct based on total eligible delegator balance", async () => {
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(typeof body.maxDelegatorApyPct).toBe("string")
    // 0xaaa is the only active delegate; delegators to 0xaaa have 500+300=800 ENS
    // tier 0 poolSize = 5000, delegatorPoolBps = 9000:
    // delegatorPool = 5000 * 9000 / 10000 = 4500 ENS
    // maxDelegatorApyPct = (4500 * 12 / 800) * 100 = 6750.00
    expect(body.maxDelegatorApyPct).toBe("6750.00")
  })

  it("returns maxDelegatorApyPct of 0.00 when no eligible delegators", async () => {
    vi.mocked(mockDataSource.delegations.getAccountBalances).mockResolvedValue([])
    const req = new Request("http://localhost/tiers/progression")
    const res = await tiersRouter.fetch(req)
    const body = await res.json()
    expect(body.maxDelegatorApyPct).toBe("0.00")
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
    }
  })
})
