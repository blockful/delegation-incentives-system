import { describe, it, expect } from "vitest";
import { computeTimeWeightedBalance } from "@/domain/time-weighted-balance.js";
import { type BalanceEvent, wei, seconds } from "@/domain/types.js";

function makeEvent(
  balance: bigint,
  timestamp: bigint,
  delta?: bigint,
): BalanceEvent {
  return {
    accountId: "test",
    balance: wei(balance),
    delta: wei(delta ?? 0n),
    timestamp: seconds(timestamp),
  };
}

const WINDOW_START = seconds(0n);
const WINDOW_END = seconds(180n * 86400n); // 180 days in seconds
const TOTAL_SECONDS = 180n * 86400n;

describe("computeTimeWeightedBalance", () => {
  it("returns initial balance when no events occur", () => {
    const result = computeTimeWeightedBalance(
      [],
      WINDOW_START,
      WINDOW_END,
      wei(100n),
    );
    expect(result).toBe(wei(100n));
  });

  it("computes correctly for constant balance (events that don't change balance)", () => {
    const events = [makeEvent(100n, 86400n)]; // balance stays 100
    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(100n),
    );
    expect(result).toBe(wei(100n));
  });

  it("computes TWB when balance doubles at exact midpoint", () => {
    const midpoint = TOTAL_SECONDS / 2n;
    const events = [makeEvent(200n, midpoint)];
    const result = computeTimeWeightedBalance(
      events,
      WINDOW_START,
      WINDOW_END,
      wei(100n),
    );
    // First half: 100 * (midpoint) = 100 * 7776000
    // Second half: 200 * (midpoint) = 200 * 7776000
    // TWB = (100 * 7776000 + 200 * 7776000) / 15552000 = 300 * 7776000 / 15552000 = 150
    expect(result).toBe(wei(150n));
  });

  it("computes TWB with multiple balance changes", () => {
    // Window is 300 seconds for simplicity
    const start = seconds(0n);
    const end = seconds(300n);
    const events = [
      makeEvent(200n, 100n), // at t=100, balance changes to 200
      makeEvent(300n, 200n), // at t=200, balance changes to 300
    ];
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // Segment 1: 100 * 100 = 10000
    // Segment 2: 200 * 100 = 20000
    // Segment 3: 300 * 100 = 30000
    // TWB = 60000 / 300 = 200
    expect(result).toBe(wei(200n));
  });

  it("handles events at the exact window start", () => {
    const start = seconds(0n);
    const end = seconds(300n);
    const events = [makeEvent(500n, 0n)]; // event at window start
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // The event at t=0 changes balance to 500 immediately
    // 500 * 300 / 300 = 500
    expect(result).toBe(wei(500n));
  });

  it("handles events at the exact window end", () => {
    const start = seconds(0n);
    const end = seconds(300n);
    const events = [makeEvent(500n, 300n)]; // event at window end
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // Balance is 100 for entire window (event at boundary doesn't contribute)
    // 100 * 300 / 300 = 100
    expect(result).toBe(wei(100n));
  });

  it("clamps events outside the window", () => {
    const start = seconds(100n);
    const end = seconds(400n);
    // Event before window start and after window end
    const events = [
      makeEvent(50n, 50n), // before window — should be clamped
      makeEvent(200n, 200n), // within window
      makeEvent(999n, 500n), // after window — should be ignored
    ];
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // The event at t=50 is before window start, but sets the initial state
    // At window start (100), balance is 50 (from the pre-window event)
    // Wait — initial balance param is 100, but event at t=50 sets it to 50
    // Pre-window events should update the "initial balance" at window start
    // So effective initial = 50
    // Segment 1: 50 * (200-100) = 50 * 100 = 5000
    // Segment 2: 200 * (400-200) = 200 * 200 = 40000
    // TWB = 45000 / 300 = 150
    expect(result).toBe(wei(150n));
  });

  it("handles multiple events at the same timestamp (last-write-wins)", () => {
    const start = seconds(0n);
    const end = seconds(200n);
    const events = [
      makeEvent(150n, 100n),
      makeEvent(250n, 100n), // same timestamp, should override
    ];
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // Segment 1: 100 * 100 = 10000
    // Segment 2: 250 * 100 = 25000 (last event at t=100 wins)
    // TWB = 35000 / 200 = 175
    expect(result).toBe(wei(175n));
  });

  it("returns 0 when initial balance is 0 and no events", () => {
    const result = computeTimeWeightedBalance(
      [],
      WINDOW_START,
      WINDOW_END,
      wei(0n),
    );
    expect(result).toBe(wei(0n));
  });

  it("handles balance going to zero mid-window", () => {
    const start = seconds(0n);
    const end = seconds(400n);
    const events = [makeEvent(0n, 200n)]; // balance drops to 0 at midpoint
    const result = computeTimeWeightedBalance(events, start, end, wei(100n));
    // Segment 1: 100 * 200 = 20000
    // Segment 2: 0 * 200 = 0
    // TWB = 20000 / 400 = 50
    expect(result).toBe(wei(50n));
  });
});
