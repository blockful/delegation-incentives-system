import { describe, it, expect, vi, beforeEach } from "vitest"
import { distributionsRouter, isMonthOver } from "../distributions.js"
import { wei, basisPoints } from "@ens-dis/domain"
import type { DistributionResult } from "@ens-dis/domain"

vi.mock("../../rounds.js", () => ({
  isConfiguredRound: vi.fn(() => true),
}))

vi.mock("../../data-source.js", () => ({
  buildDataSource: vi.fn(),
}))

vi.mock("@ens-dis/domain", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@ens-dis/domain")>()
  return { ...actual, runDistributionPipeline: vi.fn() }
})

vi.mock("../../ens-cache.js", () => ({
  getCachedEnsName: vi.fn(() => null),
  getCachedAvatarUrl: vi.fn(() => null),
}))

import { isConfiguredRound } from "../../rounds.js"
import { buildDataSource } from "../../data-source.js"
import { runDistributionPipeline } from "@ens-dis/domain"

// 2025-03 is always in the past; 2099-12 is always in the future.
const PAST_MONTH = "2025-03"
const FUTURE_MONTH = "2099-12"

const MOCK_RESULT: DistributionResult = {
  month: PAST_MONTH,
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

// ─── isMonthOver ─────────────────────────────────────────────────────────────

describe("isMonthOver", () => {
  it("returns true for a month clearly in the past", () => {
    expect(isMonthOver(PAST_MONTH)).toBe(true)
  })

  it("returns false for a month clearly in the future", () => {
    expect(isMonthOver(FUTURE_MONTH)).toBe(false)
  })
})

// ─── GET /distributions ───────────────────────────────────────────────────────

describe("GET /distributions", () => {
  it("returns 200 [] when empty", async () => {
    const res = await distributionsRouter.fetch(new Request("http://localhost/distributions"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([])
  })

  it("returns list of computed months", async () => {
    distributionStore.set(PAST_MONTH, MOCK_RESULT)
    const res = await distributionsRouter.fetch(new Request("http://localhost/distributions"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual([PAST_MONTH])
  })

  it("returns 500 when list() throws", async () => {
    vi.mocked(mockDataSource.distributions.list).mockRejectedValueOnce(new Error("DB error"))
    const res = await distributionsRouter.fetch(new Request("http://localhost/distributions"))
    expect(res.status).toBe(500)
  })
})

// ─── GET /distributions/{month} ───────────────────────────────────────────────

describe("GET /distributions/{month}", () => {
  it("returns cached result without calling pipeline", async () => {
    distributionStore.set(PAST_MONTH, MOCK_RESULT)
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.month).toBe(PAST_MONTH)
    expect(vi.mocked(runDistributionPipeline)).not.toHaveBeenCalled()
  })

  it("auto-computes on first GET for a past configured round", async () => {
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.month).toBe(PAST_MONTH)
    expect(vi.mocked(runDistributionPipeline)).toHaveBeenCalledTimes(1)
  })

  it("saves result to store on first compute so subsequent calls skip pipeline", async () => {
    await distributionsRouter.fetch(new Request(`http://localhost/distributions/${PAST_MONTH}`))
    vi.mocked(runDistributionPipeline).mockClear()

    const res2 = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res2.status).toBe(200)
    expect(vi.mocked(runDistributionPipeline)).not.toHaveBeenCalled()
  })

  it("concurrent requests share one in-flight computation", async () => {
    const [res1, res2] = await Promise.all([
      distributionsRouter.fetch(new Request(`http://localhost/distributions/${PAST_MONTH}`)),
      distributionsRouter.fetch(new Request(`http://localhost/distributions/${PAST_MONTH}`)),
    ])
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(vi.mocked(runDistributionPipeline)).toHaveBeenCalledTimes(1)
  })

  it("retries computation after pipeline failure", async () => {
    vi.mocked(runDistributionPipeline).mockRejectedValueOnce(new Error("pipeline failed"))

    const res1 = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res1.status).toBe(500)

    // Second request must retry — in-flight entry was removed on failure
    const res2 = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res2.status).toBe(200)
    expect(vi.mocked(runDistributionPipeline)).toHaveBeenCalledTimes(2)
  })

  it("returns 404 when month has not ended yet", async () => {
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${FUTURE_MONTH}`),
    )
    expect(res.status).toBe(404)
    expect(vi.mocked(runDistributionPipeline)).not.toHaveBeenCalled()
  })

  it("returns 404 for non-configured round even if month is over", async () => {
    vi.mocked(isConfiguredRound).mockReturnValueOnce(false)
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res.status).toBe(404)
    expect(vi.mocked(runDistributionPipeline)).not.toHaveBeenCalled()
  })

  it("returns 500 when load() throws", async () => {
    vi.mocked(mockDataSource.distributions.load).mockRejectedValueOnce(new Error("DB error"))
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}`),
    )
    expect(res.status).toBe(500)
  })
})

// ─── GET /distributions/{month}/csv ──────────────────────────────────────────

describe("GET /distributions/{month}/csv", () => {
  it("returns 404 when month has not ended", async () => {
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${FUTURE_MONTH}/csv`),
    )
    expect(res.status).toBe(404)
  })

  it("auto-computes and returns CSV for a past month", async () => {
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}/csv`),
    )
    expect(res.status).toBe(200)
    expect(res.headers.get("Content-Type")).toContain("text/csv")
    expect(res.headers.get("Content-Disposition")).toContain(`distribution-${PAST_MONTH}.csv`)
    const text = await res.text()
    expect(text).toContain("address")
    expect(vi.mocked(runDistributionPipeline)).toHaveBeenCalledTimes(1)
  })

  it("returns cached result for CSV without recomputing", async () => {
    distributionStore.set(PAST_MONTH, MOCK_RESULT)
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}/csv`),
    )
    expect(res.status).toBe(200)
    expect(vi.mocked(runDistributionPipeline)).not.toHaveBeenCalled()
  })

  it("returns 500 when load() throws", async () => {
    vi.mocked(mockDataSource.distributions.load).mockRejectedValueOnce(new Error("DB error"))
    const res = await distributionsRouter.fetch(
      new Request(`http://localhost/distributions/${PAST_MONTH}/csv`),
    )
    expect(res.status).toBe(500)
  })
})
