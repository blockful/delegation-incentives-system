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

const ROUNDS = ["2026-03", "2026-04", "2026-05"]

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

describe("getCurrentRound (pure)", () => {
  it("returns null for empty rounds array", () => {
    expect(getCurrentRound(new Date("2026-03-15T00:00:00Z"), [])).toBeNull()
  })

  it("returns round 1 on first day of first month", () => {
    const result = getCurrentRound(new Date("2026-03-01T00:00:00Z"), ROUNDS)
    expect(result).not.toBeNull()
    expect(result!.roundNumber).toBe(1)
    expect(result!.month).toBe("2026-03")
    expect(result!.startDate.toISOString()).toBe("2026-03-01T00:00:00.000Z")
    expect(result!.endDate.toISOString()).toBe("2026-04-01T00:00:00.000Z")
    expect(result!.percentComplete).toBe(0)
  })

  it("returns round 2 during second month", () => {
    const result = getCurrentRound(new Date("2026-04-15T00:00:00Z"), ROUNDS)
    expect(result!.roundNumber).toBe(2)
    expect(result!.month).toBe("2026-04")
  })

  it("returns round 3 during third month", () => {
    const result = getCurrentRound(new Date("2026-05-01T00:00:00Z"), ROUNDS)
    expect(result!.roundNumber).toBe(3)
    expect(result!.month).toBe("2026-05")
  })

  it("percentComplete is 0 at start of month", () => {
    const result = getCurrentRound(new Date("2026-03-01T00:00:00Z"), ROUNDS)
    expect(result!.percentComplete).toBe(0)
  })

  it("percentComplete is approximately 48 at March 16 (15/31 days elapsed)", () => {
    // Math.floor(15/31 * 100) = floor(48.38) = 48
    const result = getCurrentRound(new Date("2026-03-16T00:00:00Z"), ROUNDS)
    expect(result!.percentComplete).toBe(48)
  })

  it("percentComplete is 99 at 1ms before end of month (Math.floor)", () => {
    // Math.floor means 100% only shows when the round is fully over
    const result = getCurrentRound(new Date("2026-03-31T23:59:59.999Z"), ROUNDS)
    expect(result!.percentComplete).toBe(99)
  })

  it("percentComplete is 100 when past all rounds", () => {
    const result = getCurrentRound(new Date("2026-10-01T00:00:00Z"), ROUNDS)
    expect(result!.percentComplete).toBe(100)
  })

  it("daysRemaining is 7 on March 25 (7 days until April 1)", () => {
    const result = getCurrentRound(new Date("2026-03-25T00:00:00Z"), ROUNDS)
    expect(result!.daysRemaining).toBe(7)
  })

  it("daysRemaining is 1 at 1ms before end of month (Math.ceil)", () => {
    const result = getCurrentRound(new Date("2026-03-31T23:59:59.999Z"), ROUNDS)
    expect(result!.daysRemaining).toBe(1)
  })

  it("daysRemaining is 0 when past all rounds", () => {
    const result = getCurrentRound(new Date("2026-10-01T00:00:00Z"), ROUNDS)
    expect(result!.daysRemaining).toBe(0)
  })

  it("daysRemaining is full month at start", () => {
    const result = getCurrentRound(new Date("2026-03-01T00:00:00Z"), ROUNDS)
    expect(result!.daysRemaining).toBe(31) // March has 31 days
  })

  it("returns first round when now is before all rounds", () => {
    const result = getCurrentRound(new Date("2026-01-01T00:00:00Z"), ROUNDS)
    expect(result!.roundNumber).toBe(1)
    expect(result!.month).toBe("2026-03")
    expect(result!.percentComplete).toBe(0)
    // daysRemaining capped to the month's own duration, not (endDate - now)
    expect(result!.daysRemaining).toBe(31)
  })

  it("returns last round when now is after all rounds", () => {
    const result = getCurrentRound(new Date("2026-10-01T00:00:00Z"), ROUNDS)
    expect(result!.roundNumber).toBe(3)
    expect(result!.month).toBe("2026-05")
  })

  it("uses calendar month boundaries, not 30-day windows", () => {
    // March has 31 days, April has 30 days
    const march = getCurrentRound(new Date("2026-03-01T00:00:00Z"), ROUNDS)
    const april = getCurrentRound(new Date("2026-04-01T00:00:00Z"), ROUNDS)
    const marchDuration = march!.endDate.getTime() - march!.startDate.getTime()
    const aprilDuration = april!.endDate.getTime() - april!.startDate.getTime()
    expect(marchDuration).toBe(31 * 24 * 60 * 60 * 1000)
    expect(aprilDuration).toBe(30 * 24 * 60 * 60 * 1000)
  })
})

// ── HTTP route tests — GET /rounds/current ───────────────────────────────────

describe("GET /rounds/current", () => {
  it("returns 404 when ROUND_MONTHS is not configured", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(null)
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(404)
  })

  it("returns 200 with correct shape when rounds are configured", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04", "2026-05"])
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(typeof body.roundNumber).toBe("number")
    expect(typeof body.month).toBe("string")
    expect(typeof body.startDate).toBe("string")
    expect(typeof body.endDate).toBe("string")
    expect(typeof body.percentComplete).toBe("number")
    expect(typeof body.daysRemaining).toBe("number")
    expect(typeof body.poolSizeEns).toBe("string")
    expect(typeof body.tierIndex).toBe("number")
  })

  it("month field matches a configured round", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04", "2026-05"])
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(["2026-03", "2026-04", "2026-05"]).toContain(body.month)
  })

  it("startDate and endDate are valid ISO strings", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04", "2026-05"])
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(new Date(body.startDate).toISOString()).toBe(body.startDate)
    expect(new Date(body.endDate).toISOString()).toBe(body.endDate)
  })

  it("percentComplete is between 0 and 100", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03", "2026-04", "2026-05"])
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    const body = await res.json()
    expect(body.percentComplete).toBeGreaterThanOrEqual(0)
    expect(body.percentComplete).toBeLessThanOrEqual(100)
  })

  it("returns 500 on data source error", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03"])
    vi.mocked(mockDataSource.proposals.getRecentProposals).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(500)
  })

  it("returns 404 when configuredMonths is an empty array (no rounds defined)", async () => {
    // getConfiguredRounds() returns [] if ROUND_MONTHS is somehow an empty Set —
    // getCurrentRound(now, []) returns null → 404
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue([])
    const req = new Request("http://localhost/rounds/current")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(404)
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

  it("returns 500 when data source throws", async () => {
    vi.spyOn(roundsModule, "getConfiguredRounds").mockReturnValue(["2026-03"])
    vi.mocked(mockDataSource.distributions.list).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request("http://localhost/rounds")
    const res = await roundsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })
})
