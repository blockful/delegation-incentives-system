/**
 * Cross-format consistency tests.
 *
 * The distribution result is served via two output paths:
 *   1. JSON API  — GET /distributions/{month}     → distributionToJson()
 *   2. CSV file  — GET /distributions/{month}/csv  → distributionToCsv()
 *
 * Both start from the same DistributionResult object. If they disagree
 * on addresses or amounts, the operator reviewing JSON would see one value
 * while the token transfer script consuming CSV would send a different amount.
 *
 * These tests verify both paths produce identical financial data.
 */
import { describe, it, expect, vi } from "vitest"
import { distributionToJson } from "../json-writer.js"
import { distributionToCsv } from "../csv-writer.js"
import { distributionResultToJson, distributionResultFromJson } from "../../adapters/DistributionAdapter.js"
import type { DistributionResult } from "@ens-dis/domain"
import { wei, basisPoints } from "@ens-dis/domain"

vi.mock("../../ens-cache.js", () => ({
  getCachedEnsName: vi.fn(() => null),
  getCachedAvatarUrl: vi.fn(() => null),
}))

const ONE_ENS = 10n ** 18n

// 50 + 250 + 100 = 400 (direct) + 3 (lottery) = 403 ENS total
const EXPECTED_TOTAL = 403n * ONE_ENS

function makeRealisticResult(): DistributionResult {
  return {
    month: "2026-03",
    metadata: {
      totalDistributed: wei(EXPECTED_TOTAL),
      poolTier: {
        momGrowthMinBps: basisPoints(0n),
        momGrowthMaxBps: basisPoints(1000n),
        poolSize: wei(5_000n * ONE_ENS),
        delegateCap: wei(50n * ONE_ENS),
        delegatorCap: wei(250n * ONE_ENS),
      },
      momGrowthBps: basisPoints(500n),
      activeDelegateCount: 1,
      eligibleDelegatorCount: 3,
      computedAt: "2026-04-01T00:00:01.000Z",
      randaoSeed: 0xdeadbeefn,
    },
    directPayouts: [
      { address: "0xdelegate_alpha", amount: wei(50n * ONE_ENS), role: "delegate" },
      { address: "0xdelegator_big", amount: wei(250n * ONE_ENS), role: "delegator" },
      { address: "0xdelegator_med", amount: wei(100n * ONE_ENS), role: "delegator" },
    ],
    lotteryPools: [
      {
        totalPrize: wei(3n * ONE_ENS),
        winner: "0xlottery_winner",
        entries: [
          { address: "0xlottery_winner", originalAmount: wei(2n * ONE_ENS), role: "delegator" },
          { address: "0xlottery_loser", originalAmount: wei(1n * ONE_ENS), role: "delegator" },
        ],
      },
    ],
  }
}

describe("cross-format consistency: JSON API vs CSV output", () => {
  it("all direct payout addresses match between JSON and CSV", () => {
    const result = makeRealisticResult()
    const json = JSON.parse(distributionToJson(result))
    const csv = distributionToCsv(result)

    const jsonAddresses = json.directPayouts.map((p: any) => p.address)
    const csvDirectRows = csv.split("\n").slice(1).filter((l: string) => l.includes(",direct"))
    const csvAddresses = csvDirectRows.map((row: string) => row.split(",")[0])

    expect(jsonAddresses.sort()).toEqual(csvAddresses.sort())
  })

  it("all direct payout amounts match between JSON and CSV (wei precision)", () => {
    const result = makeRealisticResult()
    const json = JSON.parse(distributionToJson(result))
    const csv = distributionToCsv(result)

    const jsonAmounts = json.directPayouts
      .map((p: any) => p.amount)
      .sort()

    const csvDirectRows = csv.split("\n").slice(1).filter((l: string) => l.includes(",direct"))
    const csvAmounts = csvDirectRows
      .map((row: string) => row.split(",")[1])
      .sort()

    expect(jsonAmounts).toEqual(csvAmounts)
  })

  it("lottery winner address and prize match between JSON and CSV", () => {
    const result = makeRealisticResult()
    const json = JSON.parse(distributionToJson(result))
    const csv = distributionToCsv(result)

    const jsonPool = json.lotteryPools[0]
    const csvLotteryRow = csv.split("\n").find((l: string) => l.includes("lottery_winner"))!
    const [csvWinnerAddr, csvWinnerWei] = csvLotteryRow.split(",")

    expect(csvWinnerAddr).toBe(jsonPool.winner)
    expect(csvWinnerWei).toBe(jsonPool.totalPrize)
  })

  it("total wei across all CSV rows matches JSON metadata.totalDistributed", () => {
    const result = makeRealisticResult()
    const json = JSON.parse(distributionToJson(result))
    const csv = distributionToCsv(result)

    const csvDataRows = csv.trim().split("\n").slice(1)
    const csvTotalWei = csvDataRows.reduce((sum, row) => {
      const weiStr = row.split(",")[1]
      return sum + BigInt(weiStr)
    }, 0n)

    expect(csvTotalWei.toString()).toBe(json.metadata.totalDistributed)
  })
})

describe("cross-format consistency: DB roundtrip → JSON API → CSV", () => {
  it("pipeline result → DB save → DB load → JSON output preserves all amounts", () => {
    const original = makeRealisticResult()

    const dbJson = distributionResultToJson(original)
    const loaded = distributionResultFromJson(dbJson)

    const apiJson = JSON.parse(distributionToJson(loaded))

    expect(apiJson.directPayouts[0].amount).toBe((50n * ONE_ENS).toString())
    expect(apiJson.directPayouts[1].amount).toBe((250n * ONE_ENS).toString())
    expect(apiJson.directPayouts[2].amount).toBe((100n * ONE_ENS).toString())
    expect(apiJson.lotteryPools[0].totalPrize).toBe((3n * ONE_ENS).toString())
    expect(apiJson.metadata.totalDistributed).toBe(EXPECTED_TOTAL.toString())

    expect(apiJson.directPayouts[0].address).toBe("0xdelegate_alpha")
    expect(apiJson.directPayouts[0].role).toBe("delegate")
    expect(apiJson.directPayouts[1].role).toBe("delegator")
  })

  it("pipeline result → DB save → DB load → CSV output preserves all amounts", () => {
    const original = makeRealisticResult()

    const dbJson = distributionResultToJson(original)
    const loaded = distributionResultFromJson(dbJson)

    const csv = distributionToCsv(loaded)
    const csvDataRows = csv.trim().split("\n").slice(1)

    const csvTotalWei = csvDataRows.reduce((sum, row) => {
      return sum + BigInt(row.split(",")[1])
    }, 0n)

    expect(csvTotalWei).toBe(EXPECTED_TOTAL)

    const delegateRow = csvDataRows.find(r => r.includes("0xdelegate_alpha"))!
    expect(delegateRow).toContain((50n * ONE_ENS).toString())
    expect(delegateRow).toContain("delegate")
    expect(delegateRow).toContain("direct")
  })

  it("JSON and CSV produce identical totals after DB roundtrip", () => {
    const original = makeRealisticResult()

    const dbJson = distributionResultToJson(original)
    const loaded = distributionResultFromJson(dbJson)

    const apiJson = JSON.parse(distributionToJson(loaded))
    const csv = distributionToCsv(loaded)

    const jsonTotal = BigInt(apiJson.metadata.totalDistributed)

    const csvDataRows = csv.trim().split("\n").slice(1)
    const csvTotal = csvDataRows.reduce((sum, row) => {
      return sum + BigInt(row.split(",")[1])
    }, 0n)

    expect(jsonTotal).toBe(csvTotal)
  })
})
