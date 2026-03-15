import { describe, it, expect, vi, beforeEach } from "vitest"
import { roundsRouter, getCurrentRound } from "../rounds.js"
import { seconds, wei, ROUND_1_START, ROUND_DURATION_DAYS } from "@ens-dis/domain"

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

// ── Pure function tests ────────────────────────────────────────────────────────

describe("getCurrentRound (pure)", () => {
  it("returns round 1 at program start", () => {
    const result = getCurrentRound(ROUND_1_START)
    expect(result.roundNumber).toBe(1)
    expect(result.startDate.toISOString()).toBe(ROUND_1_START.toISOString())
    expect(result.percentComplete).toBe(0)
  })

  it("returns round 1 halfway through first round", () => {
    const halfwayMs = ROUND_1_START.getTime() + (ROUND_DURATION_DAYS / 2) * 24 * 60 * 60 * 1000
    const result = getCurrentRound(new Date(halfwayMs))
    expect(result.roundNumber).toBe(1)
    expect(result.percentComplete).toBe(50)
    expect(result.daysRemaining).toBe(15)
  })

  it("returns round 2 after first round ends", () => {
    const round2StartMs = ROUND_1_START.getTime() + ROUND_DURATION_DAYS * 24 * 60 * 60 * 1000
    const result = getCurrentRound(new Date(round2StartMs))
    expect(result.roundNumber).toBe(2)
    expect(result.percentComplete).toBe(0)
    expect(result.daysRemaining).toBe(ROUND_DURATION_DAYS)
  })

  it("endDate is startDate + 30 days", () => {
    const result = getCurrentRound(ROUND_1_START)
    const diffMs = result.endDate.getTime() - result.startDate.getTime()
    const diffDays = diffMs / (24 * 60 * 60 * 1000)
    expect(diffDays).toBe(ROUND_DURATION_DAYS)
  })

  it("handles dates before program launch as round 1 with 0% progress", () => {
    const beforeLaunch = new Date(ROUND_1_START.getTime() - 1000)
    const result = getCurrentRound(beforeLaunch)
    expect(result.roundNumber).toBe(1)
    expect(result.percentComplete).toBe(0)
  })

  it("percentComplete is 100 at end of round", () => {
    // 1ms before round ends
    const almostEnd = new Date(ROUND_1_START.getTime() + ROUND_DURATION_DAYS * 24 * 60 * 60 * 1000 - 1)
    const result = getCurrentRound(almostEnd)
    expect(result.roundNumber).toBe(1)
    expect(result.percentComplete).toBe(100)
  })
})

// ── HTTP route tests ──────────────────────────────────────────────────────────

describe("GET /rounds/current", () => {
  it("returns 200 with correct shape", async () => {
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.roundNumber).toBe("number")
    expect(typeof body.startDate).toBe("string")
    expect(typeof body.endDate).toBe("string")
    expect(typeof body.percentComplete).toBe("number")
    expect(typeof body.daysRemaining).toBe("number")
    expect(typeof body.poolSizeEns).toBe("string")
    expect(typeof body.tierIndex).toBe("number")
  })

  it("roundNumber is a positive integer", async () => {
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(body.roundNumber).toBeGreaterThan(0)
    expect(Number.isInteger(body.roundNumber)).toBe(true)
  })

  it("startDate and endDate are valid ISO strings", async () => {
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(new Date(body.startDate).toISOString()).toBe(body.startDate)
    expect(new Date(body.endDate).toISOString()).toBe(body.endDate)
  })

  it("percentComplete is between 0 and 100", async () => {
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(body.percentComplete).toBeGreaterThanOrEqual(0)
    expect(body.percentComplete).toBeLessThanOrEqual(100)
  })

  it("poolSizeEns matches tier 0 pool size for default mock data", async () => {
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    // Default mock returns 1000 ENS AVP with no previous => tier 0 => 5000 ENS pool
    expect(body.poolSizeEns).toBe("5000")
    expect(body.tierIndex).toBe(0)
  })

  it("returns 500 on data source error", async () => {
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBe("DB connection failed")
  })
})
