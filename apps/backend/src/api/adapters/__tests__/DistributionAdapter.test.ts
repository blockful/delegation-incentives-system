import { describe, it, expect } from "vitest"
import { FakePonderDb } from "../../../../test/doubles/fake-ponder-db.js"
import { DistributionAdapter } from "../DistributionAdapter.js"
import {
  type DistributionResult,
  wei,
  basisPoints,
} from "@ens-dis/domain"

function makeResult(month: string): DistributionResult {
  return {
    month,
    directPayouts: [
      { address: "0xaaa", amount: wei(1000000000000000000n), role: "delegate" },
      { address: "0xbbb", amount: wei(500000000000000000n), role: "delegator" },
    ],
    lotteryPools: [
      {
        totalPrize: wei(2000000000000000000n),
        winner: "0xccc",
        entries: [
          { address: "0xccc", originalAmount: wei(999999999999999999n), role: "delegator" },
        ],
      },
    ],
    metadata: {
      totalDistributed: wei(3500000000000000000n),
      poolTier: {
        momGrowthMinBps: basisPoints(0n),
        momGrowthMaxBps: basisPoints(10000n),
        poolSize: wei(10000000000000000000000n),
        delegateCap: wei(1000000000000000000000n),
        delegatorCap: wei(100000000000000000000n),
      },
      momGrowthBps: basisPoints(500n),
      activeDelegateCount: 42,
      eligibleDelegatorCount: 1337,
      computedAt: "2026-01-01T00:00:00.000Z",
      randaoSeed: 0xdeadbeefcafebaben,
    },
  }
}

describe("DistributionAdapter", () => {
  it("save then load round-trips with all BigInt fields intact", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    const original = makeResult("2026-01")
    await adapter.save("2026-01", original)
    const loaded = await adapter.load("2026-01")

    expect(loaded).not.toBeNull()

    // Verify all bigint fields survived the JSON round-trip
    expect(loaded!.directPayouts[0].amount).toBe(1000000000000000000n)
    expect(loaded!.directPayouts[1].amount).toBe(500000000000000000n)
    expect(loaded!.lotteryPools[0].totalPrize).toBe(2000000000000000000n)
    expect(loaded!.lotteryPools[0].entries[0].originalAmount).toBe(999999999999999999n)
    expect(loaded!.metadata.totalDistributed).toBe(3500000000000000000n)
    expect(loaded!.metadata.poolTier.poolSize).toBe(10000000000000000000000n)
    expect(loaded!.metadata.momGrowthBps).toBe(500n)
    expect(loaded!.metadata.randaoSeed).toBe(0xdeadbeefcafebaben)

    // Non-bigint fields
    expect(loaded!.month).toBe("2026-01")
    expect(loaded!.metadata.activeDelegateCount).toBe(42)
    expect(loaded!.metadata.computedAt).toBe("2026-01-01T00:00:00.000Z")
  })

  it("round-trip preserves addresses, roles, and all poolTier caps exactly", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    const original = makeResult("2026-02")
    await adapter.save("2026-02", original)
    const loaded = await adapter.load("2026-02")!

    // Addresses must survive exactly — wrong address = wrong recipient
    expect(loaded!.directPayouts[0].address).toBe("0xaaa")
    expect(loaded!.directPayouts[1].address).toBe("0xbbb")
    expect(loaded!.lotteryPools[0].winner).toBe("0xccc")
    expect(loaded!.lotteryPools[0].entries[0].address).toBe("0xccc")

    // Roles must survive — swapped role = wrong cap enforcement
    expect(loaded!.directPayouts[0].role).toBe("delegate")
    expect(loaded!.directPayouts[1].role).toBe("delegator")
    expect(loaded!.lotteryPools[0].entries[0].role).toBe("delegator")

    // All poolTier fields — used for post-distribution cap verification
    expect(loaded!.metadata.poolTier.momGrowthMinBps).toBe(0n)
    expect(loaded!.metadata.poolTier.momGrowthMaxBps).toBe(10000n)
    expect(loaded!.metadata.poolTier.delegateCap).toBe(1000000000000000000000n)
    expect(loaded!.metadata.poolTier.delegatorCap).toBe(100000000000000000000n)

    // eligibleDelegatorCount must survive
    expect(loaded!.metadata.eligibleDelegatorCount).toBe(1337)
  })

  it("round-trip with empty directPayouts and lotteryPools", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    const empty: DistributionResult = {
      ...makeResult("2026-03"),
      directPayouts: [],
      lotteryPools: [],
    }
    await adapter.save("2026-03", empty)
    const loaded = await adapter.load("2026-03")

    expect(loaded).not.toBeNull()
    expect(loaded!.directPayouts).toHaveLength(0)
    expect(loaded!.lotteryPools).toHaveLength(0)
    expect(loaded!.metadata.totalDistributed).toBe(3500000000000000000n)
  })

  it("round-trip preserves max-pool-size values (30,000 ENS = 30,000×10^18 wei)", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    const maxPool: DistributionResult = {
      ...makeResult("2026-04"),
      metadata: {
        ...makeResult("2026-04").metadata,
        totalDistributed: wei(30_000n * 10n ** 18n),
        poolTier: {
          momGrowthMinBps: basisPoints(10000n),
          momGrowthMaxBps: basisPoints(100000000n),
          poolSize: wei(30_000n * 10n ** 18n),
          delegateCap: wei(300n * 10n ** 18n),
          delegatorCap: wei(1_500n * 10n ** 18n),
        },
      },
    }
    await adapter.save("2026-04", maxPool)
    const loaded = await adapter.load("2026-04")

    expect(loaded!.metadata.totalDistributed).toBe(30_000n * 10n ** 18n)
    expect(loaded!.metadata.poolTier.poolSize).toBe(30_000n * 10n ** 18n)
    expect(loaded!.metadata.poolTier.delegateCap).toBe(300n * 10n ** 18n)
    expect(loaded!.metadata.poolTier.delegatorCap).toBe(1_500n * 10n ** 18n)
  })

  it("list returns sorted months", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    await adapter.save("2026-03", makeResult("2026-03"))
    await adapter.save("2026-01", makeResult("2026-01"))
    await adapter.save("2026-02", makeResult("2026-02"))

    const months = await adapter.list()
    expect(months).toEqual(["2026-01", "2026-02", "2026-03"])
  })

  it("load returns null for unknown month", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)
    const result = await adapter.load("9999-99")
    expect(result).toBeNull()
  })

  it("save updates existing entry (upsert)", async () => {
    const db = new FakePonderDb()
    const adapter = new DistributionAdapter(db)

    const first = makeResult("2026-01")
    await adapter.save("2026-01", first)

    // Overwrite with updated result
    const second = { ...makeResult("2026-01"), directPayouts: [] }
    await adapter.save("2026-01", second)

    const months = await adapter.list()
    expect(months).toHaveLength(1)

    const loaded = await adapter.load("2026-01")
    expect(loaded!.directPayouts).toHaveLength(0)
  })
})
