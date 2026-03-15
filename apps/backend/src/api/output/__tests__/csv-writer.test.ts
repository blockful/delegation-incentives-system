import { describe, it, expect } from "vitest"
import { distributionToCsv } from "../csv-writer.js"
import type { DistributionResult } from "@ens-dis/domain"
import { wei, basisPoints } from "@ens-dis/domain"

const ONE_ENS = 10n ** 18n

function makeFixture(): DistributionResult {
  return {
    month: "2025-03",
    metadata: {
      totalDistributed: wei(1500n * ONE_ENS),
      poolTier: {
        momGrowthMinBps: basisPoints(2000n),
        momGrowthMaxBps: basisPoints(3000n),
        poolSize: wei(10000n * ONE_ENS),
        delegateCap: wei(1000n * ONE_ENS),
        delegatorCap: wei(500n * ONE_ENS),
      },
      momGrowthBps: basisPoints(2500n),
      activeDelegateCount: 1,
      eligibleDelegatorCount: 1,
      computedAt: "2025-03-31T00:00:00.000Z",
      randaoSeed: 42n,
    },
    directPayouts: [
      {
        address: "0xdelegate1",
        amount: wei(1000n * ONE_ENS),
        role: "delegate",
      },
      {
        address: "0xdelegator1",
        amount: wei(100n * ONE_ENS),
        role: "delegator",
      },
    ],
    lotteryPools: [
      {
        totalPrize: wei(400n * ONE_ENS),
        winner: "0xlotteryWinner",
        entries: [
          {
            address: "0xlotteryWinner",
            originalAmount: wei(200n * ONE_ENS),
            role: "delegator",
          },
          {
            address: "0xotherEntry",
            originalAmount: wei(200n * ONE_ENS),
            role: "delegate",
          },
        ],
      },
    ],
  }
}

describe("distributionToCsv", () => {
  it("includes the correct header line", () => {
    const csv = distributionToCsv(makeFixture())
    const lines = csv.trim().split("\n")
    expect(lines[0]).toBe("address,amount_wei,amount_ens,role,type")
  })

  it("includes direct payout rows with type=direct", () => {
    const csv = distributionToCsv(makeFixture())
    expect(csv).toContain("0xdelegate1")
    expect(csv).toContain("0xdelegator1")
    const directRows = csv
      .split("\n")
      .filter((line) => line.includes("direct") && !line.includes("lottery"))
    expect(directRows.length).toBe(2)
  })

  it("marks delegate direct payouts with role=delegate and type=direct", () => {
    const csv = distributionToCsv(makeFixture())
    const rows = csv.split("\n")
    const delegateRow = rows.find(
      (r) => r.includes("0xdelegate1") && r.includes("direct"),
    )
    expect(delegateRow).toBeDefined()
    expect(delegateRow).toContain("delegate")
    expect(delegateRow).toContain("direct")
  })

  it("marks delegator direct payouts with role=delegator and type=direct", () => {
    const csv = distributionToCsv(makeFixture())
    const rows = csv.split("\n")
    const delegatorRow = rows.find(
      (r) => r.includes("0xdelegator1") && r.includes("direct"),
    )
    expect(delegatorRow).toBeDefined()
    expect(delegatorRow).toContain("delegator")
    expect(delegatorRow).toContain("direct")
  })

  it("includes lottery winner row with type=lottery_winner", () => {
    const csv = distributionToCsv(makeFixture())
    expect(csv).toContain("lottery_winner")
    const rows = csv.split("\n")
    const lotteryRow = rows.find((r) => r.includes("lottery_winner"))
    expect(lotteryRow).toBeDefined()
    expect(lotteryRow).toContain("0xlotteryWinner")
  })

  it("uses the winner's role from entries (delegator in fixture)", () => {
    const csv = distributionToCsv(makeFixture())
    const rows = csv.split("\n")
    const lotteryRow = rows.find((r) => r.includes("lottery_winner"))
    expect(lotteryRow).toBeDefined()
    // winner is "0xlotteryWinner" whose entry has role="delegator"
    expect(lotteryRow).toContain("delegator")
  })

  it("defaults to 'delegator' role when winner address doesn't match any entry", () => {
    const fixture = makeFixture()
    fixture.lotteryPools[0].winner = "0xunknownWinner"
    const csv = distributionToCsv(fixture)
    const rows = csv.split("\n")
    const lotteryRow = rows.find((r) => r.includes("lottery_winner"))
    expect(lotteryRow).toBeDefined()
    expect(lotteryRow).toContain("0xunknownWinner")
    expect(lotteryRow).toContain("delegator")
  })

  it("includes amount in both wei and ENS format", () => {
    const csv = distributionToCsv(makeFixture())
    // 1000 ENS = 1000000000000000000000 wei (1000 * 10^18)
    expect(csv).toContain("1000000000000000000000")
    // ENS format: "1000.000000000000000000"
    expect(csv).toContain("1000.000000000000000000")
  })

  it("produces correct number of data rows (2 direct + 1 lottery = 3)", () => {
    const csv = distributionToCsv(makeFixture())
    const lines = csv.trim().split("\n")
    // header + 3 data rows
    expect(lines.length).toBe(4)
  })
})
