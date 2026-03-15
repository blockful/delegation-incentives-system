import { describe, it, expect } from "vitest"
import { ONE_ENS } from "@ens-dis/domain"
import {
  computeApyPct,
  formatEns,
  formatWholeEns,
  toLowerSet,
  internalError,
  computeMaxDelegatorApyPct,
} from "../helpers.js"

describe("computeApyPct", () => {
  it("returns ~100% APY when reward=1 ENS/month and balance=12 ENS", () => {
    const monthlyReward = ONE_ENS // 1 ENS
    const balance = 12n * ONE_ENS // 12 ENS
    // APY = (1 * 12 / 12) * 100 = 100.00
    expect(computeApyPct(monthlyReward, balance)).toBe("100.00")
  })

  it("returns '0.00' when balance is 0", () => {
    expect(computeApyPct(ONE_ENS, 0n)).toBe("0.00")
  })

  it("returns correct value for arbitrary inputs", () => {
    // reward = 500 ENS/month, balance = 1000 ENS → APY = 500*12/1000*100 = 600%
    const reward = 500n * ONE_ENS
    const balance = 1000n * ONE_ENS
    expect(computeApyPct(reward, balance)).toBe("600.00")
  })
})

describe("formatEns", () => {
  it("formats 1 ENS (1e18 wei) as '1.0000'", () => {
    expect(formatEns(1n * 10n ** 18n)).toBe("1.0000")
  })

  it("formats 1.5 ENS as '1.5000'", () => {
    expect(formatEns(1500000000000000000n)).toBe("1.5000")
  })

  it("formats 0 as '0.0000'", () => {
    expect(formatEns(0n)).toBe("0.0000")
  })
})

describe("formatWholeEns", () => {
  it("formats 5000 ENS as '5000'", () => {
    expect(formatWholeEns(5000n * ONE_ENS)).toBe("5000")
  })

  it("formats 0 as '0'", () => {
    expect(formatWholeEns(0n)).toBe("0")
  })

  it("formats 1 ENS as '1'", () => {
    expect(formatWholeEns(ONE_ENS)).toBe("1")
  })
})

describe("toLowerSet", () => {
  it("converts addresses to lowercase", () => {
    const input = new Set(["0xABC", "0xDEF"])
    const result = toLowerSet(input)
    expect(result.has("0xabc")).toBe(true)
    expect(result.has("0xdef")).toBe(true)
    expect(result.has("0xABC")).toBe(false)
  })

  it("handles empty set", () => {
    expect(toLowerSet(new Set()).size).toBe(0)
  })

  it("handles already-lowercase addresses", () => {
    const input = new Set(["0xabcdef"])
    const result = toLowerSet(input)
    expect(result.has("0xabcdef")).toBe(true)
  })
})

describe("internalError", () => {
  it("returns 'Internal server error' string without throwing", () => {
    expect(() => internalError(new Error("boom"))).not.toThrow()
    expect(internalError(new Error("boom"))).toBe("Internal server error")
  })

  it("handles non-Error values", () => {
    expect(internalError("string error")).toBe("Internal server error")
    expect(internalError(null)).toBe("Internal server error")
  })
})

describe("computeMaxDelegatorApyPct", () => {
  it("returns '0.00' when totalWeightEns is 0", () => {
    expect(computeMaxDelegatorApyPct(10000, 9000, 0)).toBe("0.00")
  })

  it("computes correct APY: poolSize=10000, delegatorBps=9000, totalWeight=10000", () => {
    // delegatorPool = 10000 * 9000/10000 = 9000
    // APY = (9000 * 12 / 10000) * 100 = 1080.00
    expect(computeMaxDelegatorApyPct(10000, 9000, 10000)).toBe("1080.00")
  })

  it("computes correctly with smaller values", () => {
    // delegatorPool = 5000 * 5000/10000 = 2500
    // APY = (2500 * 12 / 5000) * 100 = 600.00
    expect(computeMaxDelegatorApyPct(5000, 5000, 5000)).toBe("600.00")
  })
})
