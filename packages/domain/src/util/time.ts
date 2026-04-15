/**
 * Calendar-month helpers for incentive periods.
 * All timestamps are Unix seconds (bigint). No external dependencies.
 */

/**
 * Parse a "YYYY-MM" string into its numeric parts.
 * Throws on invalid format.
 */
export function parseMonth(month: string): { year: number; month: number } {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid month format: "${month}" (expected YYYY-MM)`);
  }
  const year = Number(match[1]);
  const m = Number(match[2]);
  if (m < 1 || m > 12) {
    throw new Error(`Month out of range: ${m}`);
  }
  return { year, month: m };
}

/**
 * Unix timestamp (seconds) for the first second of the month (00:00:00 UTC on day 1).
 */
export function monthStartTimestamp(month: string): bigint {
  const { year, month: m } = parseMonth(month);
  return BigInt(Math.floor(Date.UTC(year, m - 1, 1, 0, 0, 0, 0) / 1000));
}

/**
 * Unix timestamp (seconds) for the last second of the month (23:59:59 UTC on the last day).
 */
export function monthEndTimestamp(month: string): bigint {
  const { year, month: m } = parseMonth(month);
  // Day 0 of the *next* month gives the last day of this month.
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return BigInt(
    Math.floor(Date.UTC(year, m - 1, lastDay, 23, 59, 59, 0) / 1000),
  );
}

/**
 * Return the YYYY-MM string for the month preceding the given one.
 * Handles January → December of the previous year.
 */
export function previousMonth(month: string): string {
  const { year, month: m } = parseMonth(month);
  if (m === 1) {
    return `${year - 1}-12`;
  }
  return `${year}-${String(m - 1).padStart(2, "0")}`;
}
