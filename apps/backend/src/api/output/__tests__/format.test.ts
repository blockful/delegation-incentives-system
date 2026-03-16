import { describe, it, expect } from "vitest"
import { weiToEnsString, bigintToString } from "../format.js"

describe("weiToEnsString", () => {
  it("converts 0 wei to '0.000000000000000000'", () => {
    expect(weiToEnsString(0n)).toBe("0.000000000000000000")
  })

  it("converts 1 ENS (1e18 wei) to '1.000000000000000000'", () => {
    expect(weiToEnsString(10n ** 18n)).toBe("1.000000000000000000")
  })

  it("converts 1.5 ENS to '1.500000000000000000'", () => {
    expect(weiToEnsString(1500000000000000000n)).toBe("1.500000000000000000")
  })

  it("converts 0.5 ENS to '0.500000000000000000'", () => {
    expect(weiToEnsString(500000000000000000n)).toBe("0.500000000000000000")
  })

  it("converts negative 1 ENS to '-1.000000000000000000'", () => {
    expect(weiToEnsString(-1n * 10n ** 18n)).toBe("-1.000000000000000000")
  })

  it("converts 1 wei to '0.000000000000000001' (tests padStart)", () => {
    expect(weiToEnsString(1n)).toBe("0.000000000000000001")
  })

  it("converts 2 ENS to '2.000000000000000000'", () => {
    expect(weiToEnsString(2n * 10n ** 18n)).toBe("2.000000000000000000")
  })

  it("converts 30,000 ENS (max pool size) correctly", () => {
    expect(weiToEnsString(30_000n * 10n ** 18n)).toBe("30000.000000000000000000")
  })

  it("converts 250 ENS (delegator cap) correctly", () => {
    expect(weiToEnsString(250n * 10n ** 18n)).toBe("250.000000000000000000")
  })

  it("converts sub-threshold 0.5 ENS (lottery entry) correctly", () => {
    expect(weiToEnsString(5n * 10n ** 17n)).toBe("0.500000000000000000")
  })

  it("converts tiny sub-threshold amount correctly (1/180 ENS)", () => {
    const tinyWei = 10n ** 18n / 180n
    const result = weiToEnsString(tinyWei)
    expect(result).toMatch(/^0\.005555555555555555$/)
    expect(BigInt(result.replace(".", "").replace(/^0+/, ""))).toBeGreaterThan(0n)
  })
})

describe("bigintToString", () => {
  it("converts 0n to '0'", () => {
    expect(bigintToString(0n)).toBe("0")
  })

  it("converts 1e18 to its full decimal string", () => {
    expect(bigintToString(10n ** 18n)).toBe("1000000000000000000")
  })

  it("converts negative values correctly", () => {
    expect(bigintToString(-5n)).toBe("-5")
  })

  it("converts large values without scientific notation", () => {
    expect(bigintToString(9007199254740993n)).toBe("9007199254740993")
  })

  it("converts max pool size in wei (30,000 × 10^18) without scientific notation", () => {
    const maxPoolWei = 30_000n * 10n ** 18n
    const result = bigintToString(maxPoolWei)
    expect(result).toBe("30000000000000000000000")
    expect(result).not.toContain("e")
    expect(result).not.toContain("E")
  })
})
