import { describe, it, expect } from "vitest";
import {
  computeTimeWeightedBalance,
  type BalanceSnapshot,
} from "../../src/time-weighted-balance.js";
import { wei, seconds } from "../../src/types.js";

const ENS = 10n ** 18n;

// 180 days in seconds.
const TWB_WINDOW = 15_552_000n;

const WINDOW_START = seconds(1_000_000n);
const WINDOW_END = seconds(1_000_000n + TWB_WINDOW);
const WINDOW_MID = seconds(1_000_000n + TWB_WINDOW / 2n);

function snap(balance: bigint, timestamp: bigint): BalanceSnapshot {
  return { balance: wei(balance), timestamp: seconds(timestamp) };
}

// ---------------------------------------------------------------------------
// Constant balance (no events)
// ---------------------------------------------------------------------------
describe("computeTimeWeightedBalance", () => {
  it("returns initialBalance when there are no events", () => {
    const result = computeTimeWeightedBalance(
      [],
      WINDOW_START,
      WINDOW_END,
      wei(100n * ENS),
    );
    expect(result).toBe(100n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Balance changes mid-window
  // ---------------------------------------------------------------------------
  it("averages when balance doubles at the midpoint", () => {
    // 100 ENS for first half, 200 ENS for second half -> TWB = 150 ENS
    const events: BalanceSnapshot[] = [
      snap(200n * ENS, WINDOW_MID as bigint),
    ];

    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(100n * ENS),
    );
    expect(result).toBe(150n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Balance acquired at window start
  // ---------------------------------------------------------------------------
  it("handles balance acquired exactly at window start", () => {
    // initialBalance is 0, event at windowStart sets balance to 100 ENS.
    // The event at windowStart has delta=0 from windowStart, so the accumulated
    // time for 0-balance is 0. Then 100 ENS for the full duration.
    const events: BalanceSnapshot[] = [
      snap(100n * ENS, WINDOW_START as bigint),
    ];

    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(0n),
    );
    expect(result).toBe(100n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Balance acquired halfway through
  // ---------------------------------------------------------------------------
  it("handles balance acquired halfway through the window", () => {
    // 0 for first 90 days, then 100 ENS for last 90 days -> TWB = 50 ENS
    const events: BalanceSnapshot[] = [
      snap(100n * ENS, WINDOW_MID as bigint),
    ];

    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(0n),
    );
    expect(result).toBe(50n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Multiple balance changes
  // ---------------------------------------------------------------------------
  it("integrates multiple step changes correctly", () => {
    // Window: [0, 120] (120 seconds for simplicity)
    // Initial: 10
    //   t=30: balance -> 20 (10 held for 30s)
    //   t=90: balance -> 40 (20 held for 60s)
    //   t=120: end (40 held for 30s)
    // accumulated = 10*30 + 20*60 + 40*30 = 300 + 1200 + 1200 = 2700
    // TWB = 2700 / 120 = 22 (truncated, since 2700/120 = 22.5)
    const start = seconds(0n);
    const end = seconds(120n);
    const events: BalanceSnapshot[] = [
      snap(20n, 30n),
      snap(40n, 90n),
    ];

    const result = computeTimeWeightedBalance(events, start, end, wei(10n));
    expect(result).toBe(22n); // 2700 / 120 = 22 (truncated)
  });

  // ---------------------------------------------------------------------------
  // Empty window (windowEnd == windowStart)
  // ---------------------------------------------------------------------------
  it("returns initialBalance when window is zero-length", () => {
    const result = computeTimeWeightedBalance(
      [snap(999n, WINDOW_START as bigint)],
      WINDOW_START,
      WINDOW_START,
      wei(42n),
    );
    expect(result).toBe(42n);
  });

  // ---------------------------------------------------------------------------
  // Same-timestamp events (last-write-wins)
  // ---------------------------------------------------------------------------
  it("uses last event when multiple events share a timestamp", () => {
    // Window: [0, 100]
    // Initial: 0
    //   t=50: balance -> 10  (overridden by next)
    //   t=50: balance -> 30  (this one wins)
    // accumulated = 0*50 + 30*50 = 1500
    // TWB = 1500 / 100 = 15
    const start = seconds(0n);
    const end = seconds(100n);
    const events: BalanceSnapshot[] = [
      snap(10n, 50n),
      snap(30n, 50n),
    ];

    const result = computeTimeWeightedBalance(events, start, end, wei(0n));
    expect(result).toBe(15n);
  });

  // ---------------------------------------------------------------------------
  // Large numbers (realistic Wei values)
  // ---------------------------------------------------------------------------
  it("handles large Wei-scale numbers without overflow", () => {
    // 1000 ENS (1000 * 10^18) for the full window.
    const largeBalance = wei(1000n * ENS);
    const result = computeTimeWeightedBalance(
      [],
      WINDOW_START,
      WINDOW_END,
      largeBalance,
    );
    expect(result).toBe(1000n * ENS);
  });

  it("correctly averages large Wei-scale numbers", () => {
    // 500 ENS first half, 1500 ENS second half -> TWB = 1000 ENS
    const events: BalanceSnapshot[] = [
      snap(1500n * ENS, WINDOW_MID as bigint),
    ];

    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(500n * ENS),
    );
    expect(result).toBe(1000n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Events outside window are ignored
  // ---------------------------------------------------------------------------
  it("ignores events before windowStart", () => {
    const start = seconds(100n);
    const end = seconds(200n);
    const events: BalanceSnapshot[] = [
      snap(999n, 50n), // before window — should be ignored
    ];

    const result = computeTimeWeightedBalance(events, start, end, wei(10n));
    expect(result).toBe(10n);
  });

  it("ignores events after windowEnd", () => {
    const start = seconds(100n);
    const end = seconds(200n);
    const events: BalanceSnapshot[] = [
      snap(999n, 250n), // after window — should be ignored
    ];

    const result = computeTimeWeightedBalance(events, start, end, wei(10n));
    expect(result).toBe(10n);
  });

  // ---------------------------------------------------------------------------
  // Event exactly at windowEnd
  // ---------------------------------------------------------------------------
  it("includes event exactly at windowEnd", () => {
    // Window: [0, 100], initial: 10
    // Event at t=100: balance -> 50
    // accumulated = 10 * 100 + 50 * 0 = 1000
    // TWB = 1000 / 100 = 10
    // The event at the boundary sets balance at the very end, contributing
    // zero duration, so the result is still dominated by the initial.
    const start = seconds(0n);
    const end = seconds(100n);
    const events: BalanceSnapshot[] = [snap(50n, 100n)];

    const result = computeTimeWeightedBalance(events, start, end, wei(10n));
    expect(result).toBe(10n);
  });

  // ---------------------------------------------------------------------------
  // windowEnd < windowStart (degenerate)
  // ---------------------------------------------------------------------------
  it("returns initialBalance when windowEnd < windowStart", () => {
    const result = computeTimeWeightedBalance(
      [],
      seconds(200n),
      seconds(100n),
      wei(77n),
    );
    expect(result).toBe(77n);
  });
});
