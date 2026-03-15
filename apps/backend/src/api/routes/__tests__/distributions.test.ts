import { describe, it, expect, vi, beforeEach } from "vitest"
import { distributionsRouter } from "../distributions.js"
import { wei, basisPoints, seconds } from "@ens-dis/domain"
import type { DistributionResult } from "@ens-dis/domain"

vi.mock("../../rounds.js", () => ({
  isConfiguredRound: vi.fn(() => true),
}))

import { isConfiguredRound } from "../../rounds.js"

// Mock buildDataSource
vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

// Mock runDistributionPipeline from domain
vi.mock("@ens-dis/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ens-dis/domain")>()
  return {
    ...actual,
    runDistributionPipeline: vi.fn(),
  }
})

import { buildDataSource } from "../../data-source.js"
import { runDistributionPipeline } from "@ens-dis/domain"

const MOCK_RESULT: DistributionResult = {
  month: "2025-03",
  directPayouts: [
    { address: "0xaaa", amount: wei(100n * 10n ** 18n), role: "delegate" },
  ],
  lotteryPools: [],
  metadata: {
    totalDistributed: wei(100n * 10n ** 18n),
    poolTier: {
      momGrowthMinBps: basisPoints(0n),
      momGrowthMaxBps: basisPoints(1000n),
      poolSize: wei(5000n * 10n ** 18n),
      delegateCap: wei(50n * 10n ** 18n),
      delegatorCap: wei(250n * 10n ** 18n),
    },
    momGrowthBps: basisPoints(500n),
    activeDelegateCount: 5,
    eligibleDelegatorCount: 10,
    computedAt: "2025-03-31T00:00:00.000Z",
    randaoSeed: 12345n,
  },
}

// In-memory store for distribution data
let distributionStore: Map<string, DistributionResult>

const mockDataSource = {
  distributions: {
    load: vi.fn(async (month: string) => distributionStore.get(month) ?? null),
    save: vi.fn(async (month: string, result: DistributionResult) => {
      distributionStore.set(month, result)
    }),
    list: vi.fn(async () => Array.from(distributionStore.keys()).sort()),
  },
}

beforeEach(() => {
  vi.clearAllMocks()
  distributionStore = new Map()
  vi.mocked(buildDataSource).mockReturnValue(mockDataSource as any)
  vi.mocked(runDistributionPipeline).mockResolvedValue(MOCK_RESULT)
  // Reset mock call counts
  vi.mocked(mockDataSource.distributions.load).mockImplementation(
    async (month: string) => distributionStore.get(month) ?? null,
  )
  vi.mocked(mockDataSource.distributions.save).mockImplementation(
    async (month: string, result: DistributionResult) => {
      distributionStore.set(month, result)
    },
  )
  vi.mocked(mockDataSource.distributions.list).mockImplementation(
    async () => Array.from(distributionStore.keys()).sort(),
  )
})

describe("GET /distributions", () => {
  it("returns 200 [] when empty", async () => {
    const req = new Request("http://localhost/distributions")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it("returns list after compute", async () => {
    distributionStore.set("2025-03", MOCK_RESULT)
    const req = new Request("http://localhost/distributions")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual(["2025-03"])
  })

  it("returns 500 when list() throws", async () => {
    vi.mocked(mockDataSource.distributions.list).mockRejectedValueOnce(
      new Error("DB connection failed"),
    )
    const req = new Request("http://localhost/distributions")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })
})

describe("POST /distributions/{month}/compute", () => {
  it("returns 200 with summary on first compute", async () => {
    const req = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.month).toBe("2025-03")
    expect(typeof body.totalDistributed).toBe("string")
    expect(typeof body.activeDelegateCount).toBe("number")
    expect(typeof body.eligibleDelegatorCount).toBe("number")
    expect(typeof body.directPayoutCount).toBe("number")
    expect(typeof body.lotteryPoolCount).toBe("number")
  })

  it("calls pipeline exactly once on first compute", async () => {
    const req = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    await distributionsRouter.fetch(req)
    expect(vi.mocked(runDistributionPipeline)).toHaveBeenCalledTimes(1)
  })

  it("returns same result on second call without calling pipeline again", async () => {
    const req1 = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    await distributionsRouter.fetch(req1)
    const pipelineCallCount = vi.mocked(runDistributionPipeline).mock.calls.length

    const req2 = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    const res2 = await distributionsRouter.fetch(req2)
    expect(res2.status).toBe(200)
    // Pipeline should NOT have been called again
    expect(vi.mocked(runDistributionPipeline).mock.calls.length).toBe(pipelineCallCount)
  })

  it("returns 400 for invalid month format (bad-month)", async () => {
    const req = new Request("http://localhost/distributions/bad-month/compute", {
      method: "POST",
    })
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for month without zero-pad (2025-3)", async () => {
    const req = new Request("http://localhost/distributions/2025-3/compute", {
      method: "POST",
    })
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(400)
  })

  it("returns 403 when month is not a configured round", async () => {
    vi.mocked(isConfiguredRound).mockReturnValue(false)
    const req = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(403)
    const body = await res.json()
    expect(body.error).toContain("2025-03")
  })

  it("returns 500 when pipeline throws", async () => {
    vi.mocked(isConfiguredRound).mockReturnValue(true)
    vi.mocked(runDistributionPipeline).mockRejectedValueOnce(new Error("pipeline failed"))
    const req = new Request("http://localhost/distributions/2025-03/compute", {
      method: "POST",
    })
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(typeof body.error).toBe("string")
  })
})

describe("GET /distributions/{month}", () => {
  it("returns 404 before compute", async () => {
    const req = new Request("http://localhost/distributions/2025-03")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it("returns 200 with distribution after compute", async () => {
    distributionStore.set("2025-03", MOCK_RESULT)

    const req = new Request("http://localhost/distributions/2025-03")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.month).toBe("2025-03")
    expect(body.metadata).toBeDefined()
    expect(Array.isArray(body.directPayouts)).toBe(true)
    expect(Array.isArray(body.lotteryPools)).toBe(true)
  })

  it("returns 500 when load() throws", async () => {
    vi.mocked(mockDataSource.distributions.load).mockRejectedValueOnce(
      new Error("Database connection failed"),
    )
    const req = new Request("http://localhost/distributions/2025-03")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(typeof body.error).toBe("string")
  })
})

describe("GET /distributions/{month}/csv", () => {
  it("returns 404 before compute", async () => {
    const req = new Request("http://localhost/distributions/2025-03/csv")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(404)
  })

  it("returns 200 text/csv with Content-Disposition after compute", async () => {
    distributionStore.set("2025-03", MOCK_RESULT)

    const req = new Request("http://localhost/distributions/2025-03/csv")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    expect(res.headers.get("Content-Disposition")).toContain("distribution-2025-03.csv")
    const text = await res.text()
    expect(text).toContain("address")
  })

  it("returns 500 when load() throws", async () => {
    vi.mocked(mockDataSource.distributions.load).mockRejectedValueOnce(
      new Error("Database connection failed"),
    )
    const req = new Request("http://localhost/distributions/2025-03/csv")
    const res = await distributionsRouter.fetch(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toBeDefined()
    expect(typeof body.error).toBe("string")
  })
})
