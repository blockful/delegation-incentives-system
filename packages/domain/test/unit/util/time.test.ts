import { describe, it, expect } from "vitest";
import {
  parseMonth,
  monthStartTimestamp,
  monthEndTimestamp,
  previousMonth,
} from "../../../src/util/time.js";

// ---------------------------------------------------------------------------
// parseMonth
// ---------------------------------------------------------------------------
describe("parseMonth", () => {
  it("parses a valid month string", () => {
    expect(parseMonth("2026-05")).toEqual({ year: 2026, month: 5 });
  });

  it("parses January", () => {
    expect(parseMonth("2026-01")).toEqual({ year: 2026, month: 1 });
  });

  it("parses December", () => {
    expect(parseMonth("2025-12")).toEqual({ year: 2025, month: 12 });
  });

  it("throws on invalid format (missing leading zero)", () => {
    expect(() => parseMonth("2026-5")).toThrow("Invalid month format");
  });

  it("throws on out-of-range month", () => {
    expect(() => parseMonth("2026-13")).toThrow("Month out of range");
  });

  it("throws on garbage input", () => {
    expect(() => parseMonth("not-a-month")).toThrow("Invalid month format");
  });
});

// ---------------------------------------------------------------------------
// monthStartTimestamp
// ---------------------------------------------------------------------------
describe("monthStartTimestamp", () => {
  it("returns the correct timestamp for January 2026", () => {
    // 2026-01-01 00:00:00 UTC
    const expected = BigInt(Date.UTC(2026, 0, 1, 0, 0, 0, 0) / 1000);
    expect(monthStartTimestamp("2026-01")).toBe(expected);
  });

  it("returns the correct timestamp for May 2026", () => {
    // 2026-05-01 00:00:00 UTC  →  1777593600
    const expected = BigInt(Date.UTC(2026, 4, 1, 0, 0, 0, 0) / 1000);
    expect(monthStartTimestamp("2026-05")).toBe(expected);
  });

  it("returns a value smaller than monthEndTimestamp for the same month", () => {
    const start = monthStartTimestamp("2026-03");
    const end = monthEndTimestamp("2026-03");
    expect(start < end).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// monthEndTimestamp
// ---------------------------------------------------------------------------
describe("monthEndTimestamp", () => {
  it("handles February in a non-leap year (28 days)", () => {
    // 2026 is not a leap year → Feb has 28 days
    // 2026-02-28 23:59:59 UTC
    const expected = BigInt(Date.UTC(2026, 1, 28, 23, 59, 59, 0) / 1000);
    expect(monthEndTimestamp("2026-02")).toBe(expected);
  });

  it("handles February in a leap year (29 days)", () => {
    // 2028 is a leap year → Feb has 29 days
    const expected = BigInt(Date.UTC(2028, 1, 29, 23, 59, 59, 0) / 1000);
    expect(monthEndTimestamp("2028-02")).toBe(expected);
  });

  it("handles December (31 days)", () => {
    const expected = BigInt(Date.UTC(2025, 11, 31, 23, 59, 59, 0) / 1000);
    expect(monthEndTimestamp("2025-12")).toBe(expected);
  });

  it("handles April (30 days)", () => {
    const expected = BigInt(Date.UTC(2026, 3, 30, 23, 59, 59, 0) / 1000);
    expect(monthEndTimestamp("2026-04")).toBe(expected);
  });

  it("end timestamp is exactly (days_in_month * 86400 - 1) seconds after start", () => {
    const start = monthStartTimestamp("2026-01");
    const end = monthEndTimestamp("2026-01");
    // January has 31 days → 31 * 86400 - 1 seconds span
    expect(end - start).toBe(BigInt(31 * 86400 - 1));
  });
});

// ---------------------------------------------------------------------------
// previousMonth
// ---------------------------------------------------------------------------
describe("previousMonth", () => {
  it("returns the preceding month", () => {
    expect(previousMonth("2026-05")).toBe("2026-04");
  });

  it("wraps January to December of the previous year", () => {
    expect(previousMonth("2026-01")).toBe("2025-12");
  });

  it("handles March (no year wrap)", () => {
    expect(previousMonth("2026-03")).toBe("2026-02");
  });

  it("preserves zero-padding for single-digit months", () => {
    expect(previousMonth("2026-02")).toBe("2026-01");
  });
});
