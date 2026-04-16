import type { Wei, Seconds } from "./types.js";
import { wei } from "./types.js";

/**
 * Balance event for step-function integration.
 * Events must be sorted by timestamp ascending.
 */
export interface BalanceSnapshot {
  readonly balance: Wei;
  readonly timestamp: Seconds;
}

/**
 * Compute the time-weighted average balance over a window [windowStart, windowEnd].
 *
 * @param events - Balance change events within or before the window, sorted by timestamp asc.
 *                 Each event records the new balance AFTER the change.
 * @param windowStart - Start of the TWB window (inclusive).
 * @param windowEnd - End of the TWB window (inclusive).
 * @param initialBalance - Balance at `windowStart` (the most recent balance before the window, or 0n if none).
 * @returns Time-weighted average balance in Wei.
 *
 * Algorithm:
 * 1. Start with initialBalance at windowStart.
 * 2. For each event within [windowStart, windowEnd]:
 *    - accumulate: previousBalance * (event.timestamp - lastTimestamp)
 *    - update currentBalance = event.balance
 *    - update lastTimestamp = event.timestamp
 * 3. After all events: accumulate currentBalance * (windowEnd - lastTimestamp)
 * 4. TWB = totalAccumulated / (windowEnd - windowStart)
 *
 * Events before windowStart are used to determine initialBalance and should NOT be passed here.
 * Events exactly at windowStart: the initialBalance parameter already reflects the state at windowStart.
 * Events at windowEnd: included (they affect the balance at the boundary).
 */
export function computeTimeWeightedBalance(
  events: readonly BalanceSnapshot[],
  windowStart: Seconds,
  windowEnd: Seconds,
  initialBalance: Wei,
): Wei {
  // Degenerate window: avoid division by zero.
  if (windowEnd <= windowStart) {
    return initialBalance;
  }

  const windowDuration = (windowEnd as bigint) - (windowStart as bigint);

  // Sort defensively — callers should provide sorted events, but unsorted
  // input would silently produce incorrect TWB via negative time deltas.
  const sorted =
    events.length <= 1
      ? events
      : [...events].sort(
          (a, b) =>
            Number((a.timestamp as bigint) - (b.timestamp as bigint)),
        );

  let accumulated = 0n;
  let currentBalance: bigint = initialBalance as bigint;
  let lastTimestamp: bigint = windowStart as bigint;

  for (const event of sorted) {
    const ts = event.timestamp as bigint;

    // Defensively skip events outside the window.
    if (ts < (windowStart as bigint) || ts > (windowEnd as bigint)) {
      continue;
    }

    // Same-timestamp events: last-write-wins.
    // When ts === lastTimestamp the delta is 0, so accumulation is 0
    // and we just update the balance — which is the correct behavior.
    const delta = ts - lastTimestamp;
    accumulated += currentBalance * delta;

    currentBalance = event.balance as bigint;
    lastTimestamp = ts;
  }

  // Final segment: from last event (or windowStart) to windowEnd.
  const finalDelta = (windowEnd as bigint) - lastTimestamp;
  accumulated += currentBalance * finalDelta;

  return wei(accumulated / windowDuration);
}
