import { describe, it, expect, vi, afterEach } from "vitest"
import { parseRoundMonths, isConfiguredRound, getConfiguredRounds } from "../rounds.js"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("parseRoundMonths", () => {
  it("returns null for undefined", () => {
    expect(parseRoundMonths(undefined)).toBeNull()
  })

  it("returns null for empty string", () => {
    expect(parseRoundMonths("")).toBeNull()
  })

  it("returns null for whitespace-only string", () => {
    expect(parseRoundMonths("   ")).toBeNull()
  })

  it("returns a Set with one month for '2026-03'", () => {
    const result = parseRoundMonths("2026-03")
    expect(result).not.toBeNull()
    expect(result!.has("2026-03")).toBe(true)
    expect(result!.size).toBe(1)
  })

  it("returns a Set with two months for '2026-03,2026-04'", () => {
    const result = parseRoundMonths("2026-03,2026-04")
    expect(result).not.toBeNull()
    expect(result!.has("2026-03")).toBe(true)
    expect(result!.has("2026-04")).toBe(true)
    expect(result!.size).toBe(2)
  })

  it("throws when given an invalid month string", () => {
    expect(() => parseRoundMonths("invalid")).toThrow(/invalid/i)
  })

  it("throws when month is 13 (out of range)", () => {
    expect(() => parseRoundMonths("2026-13")).toThrow()
  })

  it("throws when month is 00 (out of range)", () => {
    expect(() => parseRoundMonths("2026-00")).toThrow()
  })

  it("trims whitespace around months", () => {
    const result = parseRoundMonths(" 2026-03 , 2026-04 ")
    expect(result).not.toBeNull()
    expect(result!.has("2026-03")).toBe(true)
    expect(result!.has("2026-04")).toBe(true)
    expect(result!.size).toBe(2)
  })

  it("parses valid edge case month 01", () => {
    const result = parseRoundMonths("2026-01")
    expect(result).not.toBeNull()
    expect(result!.has("2026-01")).toBe(true)
  })

  it("parses valid edge case month 12", () => {
    const result = parseRoundMonths("2026-12")
    expect(result).not.toBeNull()
    expect(result!.has("2026-12")).toBe(true)
  })
})

describe("isConfiguredRound (no env var set → ROUND_MONTHS=null)", () => {
  it("returns true for any month when ROUND_MONTHS is null", () => {
    // In test environment, ROUND_MONTHS env var is not set, so ROUND_MONTHS=null
    expect(isConfiguredRound("2026-03")).toBe(true)
    expect(isConfiguredRound("2099-12")).toBe(true)
    expect(isConfiguredRound("some-random-value")).toBe(true)
  })
})

describe("getConfiguredRounds (no env var set → ROUND_MONTHS=null)", () => {
  it("returns null when ROUND_MONTHS is null", () => {
    expect(getConfiguredRounds()).toBeNull()
  })
})

describe("isConfiguredRound (ROUND_MONTHS env var set)", () => {
  it("returns true when month is in configured ROUND_MONTHS", async () => {
    vi.stubEnv("ROUND_MONTHS", "2026-03,2026-04")
    vi.resetModules()
    const { isConfiguredRound: fn } = await import("../rounds.js")
    expect(fn("2026-03")).toBe(true)
    expect(fn("2026-04")).toBe(true)
  })

  it("returns false when month is NOT in configured ROUND_MONTHS", async () => {
    vi.stubEnv("ROUND_MONTHS", "2026-03,2026-04")
    vi.resetModules()
    const { isConfiguredRound: fn } = await import("../rounds.js")
    expect(fn("2099-12")).toBe(false)
    expect(fn("2026-05")).toBe(false)
  })
})

describe("getConfiguredRounds (ROUND_MONTHS env var set)", () => {
  it("returns sorted array of configured months when ROUND_MONTHS is set", async () => {
    vi.stubEnv("ROUND_MONTHS", "2026-04,2026-03,2026-05")
    vi.resetModules()
    const { getConfiguredRounds: fn } = await import("../rounds.js")
    expect(fn()).toEqual(["2026-03", "2026-04", "2026-05"])
  })
})
