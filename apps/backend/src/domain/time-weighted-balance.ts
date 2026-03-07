import { type BalanceEvent, type Wei, type Seconds, wei } from "./types.js";

/**
 * Compute the time-weighted balance for an account over a window.
 * TWB = Σ(balance_i × seconds_i) / totalSeconds
 *
 * Events must be sorted by timestamp ascending.
 * Events before windowStart update the effective initial balance.
 * Events at or after windowEnd are ignored.
 */
export function computeTimeWeightedBalance(
  events: BalanceEvent[],
  windowStart: Seconds,
  windowEnd: Seconds,
  initialBalance: Wei,
): Wei {
  const totalSeconds = windowEnd - windowStart;
  if (totalSeconds <= 0n) return wei(0n);

  // Sort events by timestamp, then by array index for stability
  const sorted = [...events].sort((a, b) => {
    const diff = Number(a.timestamp - b.timestamp);
    return diff !== 0 ? diff : 0; // stable sort preserves insertion order
  });

  // Apply pre-window events to update effective initial balance
  let effectiveInitial = initialBalance;
  const windowEvents: BalanceEvent[] = [];

  for (const event of sorted) {
    if (event.timestamp < windowStart) {
      effectiveInitial = event.balance;
    } else if (event.timestamp < windowEnd) {
      windowEvents.push(event);
    }
    // Events at or after windowEnd are ignored
  }

  // Deduplicate same-timestamp events (last-write-wins)
  const deduped: BalanceEvent[] = [];
  for (let i = 0; i < windowEvents.length; i++) {
    const current = windowEvents[i];
    const next = windowEvents[i + 1];
    // Keep only the last event at each timestamp
    if (!next || next.timestamp !== current.timestamp) {
      deduped.push(current);
    }
  }

  // Build segments and compute weighted sum
  let weightedSum = 0n;
  let currentBalance: bigint = effectiveInitial;
  let currentTimestamp: bigint = windowStart;

  for (const event of deduped) {
    const segmentDuration = event.timestamp - currentTimestamp;
    if (segmentDuration > 0n) {
      weightedSum += currentBalance * segmentDuration;
    }
    currentBalance = event.balance as bigint;
    currentTimestamp = event.timestamp as bigint;
  }

  // Final segment from last event to window end
  const finalDuration = (windowEnd as bigint) - currentTimestamp;
  if (finalDuration > 0n) {
    weightedSum += currentBalance * finalDuration;
  }

  return wei(weightedSum / totalSeconds);
}
