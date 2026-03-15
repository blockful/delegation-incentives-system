import { describe, it, expect, vi } from "vitest"
import { distributionToJson } from "../json-writer.js"
import type { DistributionResult } from "@ens-dis/domain"
import { wei, basisPoints } from "@ens-dis/domain"

vi.mock("../../ens-cache.js", () => ({
  getCachedEnsName: vi.fn((address: string) => {
    const map: Record<string, string> = {
      "0xdelegate1": "delegate.eth",
      "0xlotteryWinner": "winner.eth",
    }
    return map[address] ?? null
  }),
}))

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
        ],
      },
    ],
  }
}

describe("distributionToJson", () => {
  it("returns valid JSON (JSON.parse does not throw)", () => {
    const json = distributionToJson(makeFixture())
    expect(() => JSON.parse(json)).not.toThrow()
  })

  it("BigInt fields are serialized as strings, not numbers", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(typeof parsed.metadata.totalDistributed).toBe("string")
    expect(typeof parsed.metadata.randaoSeed).toBe("string")
    expect(typeof parsed.metadata.momGrowthBps).toBe("string")
  })

  it("includes totalDistributedEns companion field", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.metadata.totalDistributedEns).toBeDefined()
    expect(parsed.metadata.totalDistributedEns).toBe("1500.000000000000000000")
  })

  it("includes amountEns on direct payouts", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.directPayouts[0].amountEns).toBeDefined()
    expect(parsed.directPayouts[0].amountEns).toBe("1000.000000000000000000")
    expect(parsed.directPayouts[1].amountEns).toBeDefined()
    expect(parsed.directPayouts[1].amountEns).toBe("100.000000000000000000")
  })

  it("includes totalPrizeEns on lottery pools", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.lotteryPools[0].totalPrizeEns).toBeDefined()
    expect(parsed.lotteryPools[0].totalPrizeEns).toBe("400.000000000000000000")
  })

  it("poolTier fields are strings", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    const tier = parsed.metadata.poolTier
    expect(typeof tier.poolSize).toBe("string")
    expect(typeof tier.delegateCap).toBe("string")
    expect(typeof tier.delegatorCap).toBe("string")
    expect(typeof tier.momGrowthMinBps).toBe("string")
    expect(typeof tier.momGrowthMaxBps).toBe("string")
  })

  it("entries[].originalAmount is a string", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(typeof parsed.lotteryPools[0].entries[0].originalAmount).toBe("string")
  })

  it("preserves month field", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.month).toBe("2025-03")
  })

  it("preserves direct payout roles", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.directPayouts[0].role).toBe("delegate")
    expect(parsed.directPayouts[1].role).toBe("delegator")
  })

  it("preserves computedAt metadata field", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.metadata.computedAt).toBe("2025-03-31T00:00:00.000Z")
  })

  it("includes ensName on direct payouts from cache", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.directPayouts[0].ensName).toBe("delegate.eth")
    expect(parsed.directPayouts[1].ensName).toBeNull()
  })

  it("includes winnerEnsName and entry ensName on lottery pools from cache", () => {
    const json = distributionToJson(makeFixture())
    const parsed = JSON.parse(json)
    expect(parsed.lotteryPools[0].winnerEnsName).toBe("winner.eth")
    expect(parsed.lotteryPools[0].entries[0].ensName).toBe("winner.eth")
  })
})
