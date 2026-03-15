/**
 * Compute the time-weighted average of a step function defined by a series
 * of (timestamp, value) snapshots over the window [from, to].
 *
 * Each snapshot records the value that takes effect AT that timestamp and
 * holds until the next snapshot. If no snapshot exists at or before `from`,
 * the value is assumed to be 0 for the period before the first snapshot.
 *
 * @param snapshots - sorted ascending by timestamp, all with timestamp <= to
 * @param from      - window start (inclusive), as raw bigint seconds
 * @param to        - window end (inclusive), as raw bigint seconds
 * @param window    - pre-computed (to - from), must be > 0
 * @returns integer TWAP (truncated, not rounded)
 */
export function computeTWAP(
  snapshots: { timestamp: bigint; votingPower: bigint }[],
  from: bigint,
  to: bigint,
  window: bigint,
): bigint {
  let accumulated = 0n;
  let prevTime = from;
  let currentVP = 0n;

  // Determine the base VP at `from`: latest snapshot with timestamp <= from
  for (const s of snapshots) {
    if (s.timestamp <= from) {
      currentVP = s.votingPower;
    } else {
      break;
    }
  }

  // Accumulate area under each step in (from, to]
  for (const s of snapshots) {
    if (s.timestamp <= from) continue;
    accumulated += currentVP * (s.timestamp - prevTime);
    currentVP = s.votingPower;
    prevTime = s.timestamp;
  }

  // Final segment: from last event to `to`
  accumulated += currentVP * (to - prevTime);

  return accumulated / window;
}
