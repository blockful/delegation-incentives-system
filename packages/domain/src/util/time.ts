import { type Seconds, seconds } from "../types.js";

/** Get the first second of a month (UTC) */
export function monthStartTimestamp(year: number, month: number): Seconds {
  return seconds(BigInt(Date.UTC(year, month - 1, 1) / 1000));
}

/** Get the last second of a month (UTC) */
export function monthEndTimestamp(year: number, month: number): Seconds {
  // First second of next month minus 1
  return seconds(BigInt(Date.UTC(year, month, 1) / 1000 - 1));
}

/** Parse "YYYY-MM" into {year, month} */
export function parseMonth(monthStr: string): { year: number; month: number } {
  const match = monthStr.match(/^(\d{4})-(\d{2})$/);
  if (!match) throw new Error(`Invalid month format: ${monthStr}. Expected YYYY-MM`);
  const month = parseInt(match[2], 10);
  if (month < 1 || month > 12)
    throw new Error(`Invalid month: ${month} in "${monthStr}". Must be 01-12`);
  return { year: parseInt(match[1], 10), month };
}

/** Get previous month as "YYYY-MM" */
export function previousMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}

/** Get the current UTC month as "YYYY-MM" */
export function currentMonth(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}
