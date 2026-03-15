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
})
