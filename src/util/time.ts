import { type Seconds, seconds } from "@/domain/types.js";

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
  return { year: parseInt(match[1], 10), month: parseInt(match[2], 10) };
}

/** Get previous month as "YYYY-MM" */
export function previousMonth(monthStr: string): string {
  const { year, month } = parseMonth(monthStr);
  if (month === 1) return `${year - 1}-12`;
  return `${year}-${String(month - 1).padStart(2, "0")}`;
}
