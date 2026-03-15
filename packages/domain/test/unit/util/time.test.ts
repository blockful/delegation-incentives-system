import { describe, it, expect } from "vitest"
import {
  monthStartTimestamp,
  monthEndTimestamp,
  parseMonth,
  previousMonth,
  currentMonth,
} from "@/util/time.js"

describe("monthStartTimestamp", () => {
  it("returns the start of 2025-03 in seconds UTC", () => {
    const expected = BigInt(new Date("2025-03-01T00:00:00Z").getTime() / 1000)
    expect(BigInt(monthStartTimestamp(2025, 3))).toBe(expected)
  })

  it("returns the start of 2026-01 in seconds UTC", () => {
    const expected = BigInt(new Date("2026-01-01T00:00:00Z").getTime() / 1000)
    expect(BigInt(monthStartTimestamp(2026, 1))).toBe(expected)
  })
})

describe("monthEndTimestamp", () => {
  it("returns the last second of 2025-03 in seconds UTC", () => {
    const expected = BigInt(new Date("2025-04-01T00:00:00Z").getTime() / 1000) - 1n
    expect(BigInt(monthEndTimestamp(2025, 3))).toBe(expected)
  })

  it("returns the correct end of December (tests Dec→Jan year boundary)", () => {
    const expected = BigInt(new Date("2026-01-01T00:00:00Z").getTime() / 1000) - 1n
    expect(BigInt(monthEndTimestamp(2025, 12))).toBe(expected)
  })

  it("returns the last second of February 2024 (leap year)", () => {
    const expected = BigInt(new Date("2024-03-01T00:00:00Z").getTime() / 1000) - 1n
    expect(BigInt(monthEndTimestamp(2024, 2))).toBe(expected)
  })
})

describe("parseMonth", () => {
  it("parses '2026-03' correctly", () => {
    expect(parseMonth("2026-03")).toEqual({ year: 2026, month: 3 })
  })

  it("parses '2026-12' correctly", () => {
    expect(parseMonth("2026-12")).toEqual({ year: 2026, month: 12 })
  })

  it("parses '2025-01' correctly", () => {
    expect(parseMonth("2025-01")).toEqual({ year: 2025, month: 1 })
  })

  it("throws for 'invalid'", () => {
    expect(() => parseMonth("invalid")).toThrow()
  })

  it("throws for wrong format '2026-3'", () => {
    expect(() => parseMonth("2026-3")).toThrow()
  })
})

describe("previousMonth", () => {
  it("returns '2026-02' for '2026-03'", () => {
    expect(previousMonth("2026-03")).toBe("2026-02")
  })

  it("returns '2025-12' for '2026-01' (year boundary)", () => {
    expect(previousMonth("2026-01")).toBe("2025-12")
  })

  it("returns '2026-10' for '2026-11'", () => {
    expect(previousMonth("2026-11")).toBe("2026-10")
  })

  it("returns '2025-09' for '2025-10'", () => {
    expect(previousMonth("2025-10")).toBe("2025-09")
  })
})

describe("currentMonth", () => {
  it("returns a string matching YYYY-MM format", () => {
    expect(currentMonth()).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/)
  })
})
