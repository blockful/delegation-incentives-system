import { describe, it, expect, vi, beforeEach } from "vitest"
import { roundsRouter, getCurrentRound } from "../rounds.js"
import { seconds, wei } from "@ens-dis/domain"

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

vi.mock("../../rounds.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../rounds.js")>()
  return { ...actual }
})

import { buildDataSource } from "../../data-source.js"
import * as roundsModule from "../../rounds.js"

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
  distributions: {
    list: vi.fn(async () => [] as string[]),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  const proposals = makeProposals(10)
  const votes = makeVotes(["0xaaa"], proposals.map((p) => p.id))
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue(proposals)
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue(votes)
  vi.mocked(mockDataSource.votingPower.getAggregateDelegatedPower).mockResolvedValue(
    wei(1000n * 10n ** 18n),
  )
  vi.mocked(mockDataSource.distributions.list).mockResolvedValue([])
})

// ── Pure function tests ────────────────────────────────────────────────────────

const MONTHS = ["2026-03", "2026-04", "2026-05"]

describe("getCurrentRound (pure)", () => {
  it("returns round 1 for the first configured month", () => {
    const now = new Date("2026-03-15T12:00:00Z")
    const result = getCurrentRound(now, MONTHS)
    expect(result.roundNumber).toBe(1)
    expect(result.startDate.toISOString()).toBe("2026-03-01T00:00:00.000Z")
    expect(result.endDate.toISOString()).toBe("2026-04-01T00:00:00.000Z")
  })

  it("returns round 2 for the second configured month", () => {
    const now = new Date("2026-04-10T00:00:00Z")
    const result = getCurrentRound(now, MONTHS)
    expect(result.roundNumber).toBe(2)
    expect(result.startDate.toISOString()).toBe("2026-04-01T00:00:00.000Z")
    expect(result.endDate.toISOString()).toBe("2026-05-01T00:00:00.000Z")
  })

  it("computes percentComplete based on calendar month", () => {
    // March 16 out of 31 days ≈ 48%
    const now = new Date("2026-03-16T00:00:00Z")
    const result = getCurrentRound(now, MONTHS)
    expect(result.percentComplete).toBe(48)
  })

  it("daysRemaining counts remaining days in the month", () => {
    const now = new Date("2026-03-25T00:00:00Z")
    const result = getCurrentRound(now, MONTHS)
    // 7 days remaining (March 25 to April 1)
    expect(result.daysRemaining).toBe(7)
  })

  it("returns the last round when now is past all configured months", () => {
    const now = new Date("2026-06-15T00:00:00Z")
    const result = getCurrentRound(now, MONTHS)
    expect(result.roundNumber).toBe(3)
  })

  it("returns fallback when no months configured", () => {
    const now = new Date("2026-03-15T00:00:00Z")
    const result = getCurrentRound(now, null)
    expect(result.roundNumber).toBe(1)
    expect(result.percentComplete).toBe(0)
  })
})

// ── HTTP route tests — GET /rounds/current ───────────────────────────────────

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
  })
})

// ── HTTP route tests — GET /rounds ────────────────────────────────────────────

describe("GET /rounds", () => {
  it("returns configured: false when ROUND_MONTHS is not set", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(null)
    const req = new Request("http://localhost/rounds")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(false)
    expect(body.rounds).toEqual([])
  })

  it("returns configured: true with pending rounds when nothing computed", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04", "2026-05"])
    const req = new Request("http://localhost/rounds")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.configured).toBe(true)
    expect(body.rounds).toHaveLength(3)
    expect(body.rounds.every((r: { status: string }) => r.status === "pending")).toBe(true)
  })

  it("marks a round as computed once its distribution exists", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04"])
    vi.mocked(mockDataSource.distributions.list).mockResolvedValue(["2026-03"])
    const req = new Request("http://localhost/rounds")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    const mar = body.rounds.find((r: { month: string }) => r.month === "2026-03")
    const apr = body.rounds.find((r: { month: string }) => r.month === "2026-04")
    expect(mar.status).toBe("computed")
    expect(apr.status).toBe("pending")
  })
})
