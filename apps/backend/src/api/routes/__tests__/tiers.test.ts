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
    endTimestamp: seconds(BigInt(2000 + i)),
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
