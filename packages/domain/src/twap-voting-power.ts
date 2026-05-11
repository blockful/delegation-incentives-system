import type { Wei, Seconds, VotingPowerEvent } from "./types.js";
import { wei } from "./types.js";
import {
  computeTimeWeightedBalance,
  type BalanceSnapshot,
} from "./time-weighted-balance.js";

/**
 * Compute the Time-Weighted Average Voting Power over [monthStart, monthEnd].
 * Same step-function integration as TWB.
 *
 * @param vpEvents - DelegateVotesChanged events within the month, sorted by timestamp asc.
 * @param monthStart - Start of the round month.
 * @param monthEnd - End of the round month.
 * @param initialVp - VP at monthStart (most recent DelegateVotesChanged.newBalance before monthStart, or 0n).
 */
export function computeTWAP(
  vpEvents: readonly VotingPowerEvent[],
  monthStart: Seconds,
  monthEnd: Seconds,
  initialVp: Wei,
): Wei {
  // Map VotingPowerEvent -> BalanceSnapshot for reuse of TWB integration.
  const snapshots: BalanceSnapshot[] = vpEvents.map((e) => ({
    balance: e.newBalance,
    timestamp: e.timestamp,
  }));

  return computeTimeWeightedBalance(snapshots, monthStart, monthEnd, initialVp);
}
