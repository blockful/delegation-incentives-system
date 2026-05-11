import { describe, it, expect } from "vitest";
import { computeTWAP } from "../../src/twap-voting-power.js";
import type { VotingPowerEvent } from "../../src/types.js";
import { wei, seconds, blockNumber } from "../../src/types.js";

const ENS = 10n ** 18n;

// ~30 days in seconds.
const MONTH_DURATION = 2_592_000n;

const MONTH_START = seconds(1_700_000_000n);
const MONTH_END = seconds(1_700_000_000n + MONTH_DURATION);
const MONTH_MID = seconds(1_700_000_000n + MONTH_DURATION / 2n);

function vpEvent(
  newBalance: bigint,
  timestamp: bigint,
): VotingPowerEvent {
  return {
    delegate: "0x1234567890abcdef1234567890abcdef12345678",
    newBalance: wei(newBalance),
    timestamp: seconds(timestamp),
    blockNumber: blockNumber(0n),
  };
}

// ---------------------------------------------------------------------------
// Constant VP for full month
// ---------------------------------------------------------------------------
describe("computeTWAP", () => {
  it("returns initialVp when there are no VP events", () => {
    // 1M ENS for the full month -> TWAP = 1M ENS
    const result = computeTWAP(
      [],
      MONTH_START,
      MONTH_END,
      wei(1_000_000n * ENS),
    );
    expect(result).toBe(1_000_000n * ENS);
  });

  // ---------------------------------------------------------------------------
  // VP doubles mid-month
  // ---------------------------------------------------------------------------
  it("averages when VP doubles at mid-month", () => {
    // 500K ENS for first half, 1M ENS for second half -> TWAP = 750K ENS
    const events: VotingPowerEvent[] = [
      vpEvent(1_000_000n * ENS, MONTH_MID as bigint),
    ];

    const result = computeTWAP(
      events,
      MONTH_START,
      MONTH_END,
      wei(500_000n * ENS),
    );
    expect(result).toBe(750_000n * ENS);
  });

  // ---------------------------------------------------------------------------
  // VP acquired at month start (was 0 before)
  // ---------------------------------------------------------------------------
  it("handles VP acquired exactly at month start", () => {
    // initialVp is 0, event at monthStart sets VP to 2M ENS.
    // 0-balance for 0 seconds, then 2M ENS for the full month.
    const events: VotingPowerEvent[] = [
      vpEvent(2_000_000n * ENS, MONTH_START as bigint),
    ];

    const result = computeTWAP(
      events,
      MONTH_START,
      MONTH_END,
      wei(0n),
    );
    expect(result).toBe(2_000_000n * ENS);
  });

  // ---------------------------------------------------------------------------
  // No VP events at all (mirrors TWB no-events case)
  // ---------------------------------------------------------------------------
  it("returns initialVp with empty event list", () => {
    const result = computeTWAP(
      [],
      MONTH_START,
      MONTH_END,
      wei(42n * ENS),
    );
    expect(result).toBe(42n * ENS);
  });

  // ---------------------------------------------------------------------------
  // Multiple VP changes within the month
  // ---------------------------------------------------------------------------
  it("integrates multiple VP changes correctly", () => {
    // Month: [0, 300] (300 seconds for simplicity)
    // Initial VP: 100
    //   t=100: VP -> 200 (100 held for 100s)
    //   t=200: VP -> 400 (200 held for 100s)
    //   t=300: end       (400 held for 100s)
    // accumulated = 100*100 + 200*100 + 400*100 = 10_000 + 20_000 + 40_000 = 70_000
    // TWAP = 70_000 / 300 = 233 (truncated from 233.33...)
    const start = seconds(0n);
    const end = seconds(300n);
    const events: VotingPowerEvent[] = [
      vpEvent(200n, 100n),
      vpEvent(400n, 200n),
    ];

    const result = computeTWAP(events, start, end, wei(100n));
    expect(result).toBe(233n);
  });

  // ---------------------------------------------------------------------------
  // VP drops to zero partway through
  // ---------------------------------------------------------------------------
  it("handles VP dropping to zero mid-month", () => {
    // Month: [0, 200]
    // Initial VP: 100
    //   t=100: VP -> 0
    // accumulated = 100*100 + 0*100 = 10_000
    // TWAP = 10_000 / 200 = 50
    const start = seconds(0n);
    const end = seconds(200n);
    const events: VotingPowerEvent[] = [vpEvent(0n, 100n)];

    const result = computeTWAP(events, start, end, wei(100n));
    expect(result).toBe(50n);
  });

  // ---------------------------------------------------------------------------
  // Zero-length window
  // ---------------------------------------------------------------------------
  it("returns initialVp when month has zero length", () => {
    const result = computeTWAP(
      [vpEvent(999n, MONTH_START as bigint)],
      MONTH_START,
      MONTH_START,
      wei(500n),
    );
    expect(result).toBe(500n);
  });
});
