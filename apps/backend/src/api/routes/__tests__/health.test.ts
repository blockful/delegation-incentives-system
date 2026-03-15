import { describe, it, expect, vi, beforeEach } from "vitest"
import { healthRouter } from "../health.js"

// Mock buildDataSource to return a minimal data source
vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

import { buildDataSource } from "../../data-source.js"

const mockDataSource = {
  proposals: {
    getRecentProposals: vi.fn().mockResolvedValue([
      { id: "1", status: "executed", timestamp: 1000n, endBlock: 2000n, daoId: "ens" },
      { id: "2", status: "defeated", timestamp: 900n, endBlock: 1800n, daoId: "ens" },
    ]),
  },
  votes: {
    getVotesForProposals: vi.fn().mockResolvedValue([]),
  },
  distributions: {
    list: vi.fn().mockResolvedValue([]),
  },
}

beforeEach(() => {
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(mockDataSource.proposals.getRecentProposals).mockResolvedValue([
    { id: "1", status: "executed", timestamp: 1000n, endBlock: 2000n, daoId: "ens" },
    { id: "2", status: "defeated", timestamp: 900n, endBlock: 1800n, daoId: "ens" },
  ])
  vi.mocked(mockDataSource.votes.getVotesForProposals).mockResolvedValue([])
  vi.mocked(mockDataSource.distributions.list).mockResolvedValue([])
})

describe("GET /health", () => {
  it("returns 200 { status: 'ok' }", async () => {
    const req = new Request("http://localhost/api/health")
    const res = await healthRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ status: "ok" })
  })
})

describe("GET /status", () => {
  it("returns 200 with non-negative counts", async () => {
    const req = new Request("http://localhost/api/status")
    const res = await healthRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.activeDelegateCount).toBeGreaterThanOrEqual(0)
    expect(body.proposalCount).toBeGreaterThanOrEqual(0)
    expect(Array.isArray(body.cachedDistributions)).toBe(true)
  })

  it("includes proposalCount matching proposal list", async () => {
    const req = new Request("http://localhost/api/status")
    const res = await healthRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.proposalCount).toBe(2)
  })

  it("includes cachedDistributions from distributions.list()", async () => {
    vi.mocked(mockDataSource.distributions.list).mockResolvedValue(["2025-01", "2025-02"])
    const req = new Request("http://localhost/api/status")
    const res = await healthRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.cachedDistributions).toEqual(["2025-01", "2025-02"])
  })
})
