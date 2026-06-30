export type RoundStatus = "live" | "ended" | "upcoming" | "paid";

export type DistributionDataStatus =
  | "available"
  | "in_progress"
  | "missing"
  | "not_started";

export interface RoundDateRange {
  month: string;
  startDate: string;
  endDate: string;
}

export interface RoundTiming {
  status: RoundStatus;
  distributionDataStatus: DistributionDataStatus;
  isCurrent: boolean;
  percentComplete: number | null;
  daysRemaining: number | null;
}

/** Parse ROUND_MONTHS env var into a stable, sorted, de-duplicated list. */
export function parseRoundMonths(raw: string | undefined): string[] {
  const seen = new Set<string>();

  return (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => /^\d{4}-\d{2}$/.test(value))
    .sort()
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });
}

export function getConfiguredRoundMonths(): string[] {
  return parseRoundMonths(process.env.ROUND_MONTHS);
}

export function getUtcMonth(now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function getRoundNumber(month: string, roundMonths: readonly string[]): number | null {
  const index = roundMonths.indexOf(month);
  return index >= 0 ? index + 1 : null;
}

export function getRoundMonth(roundNumber: number, roundMonths: readonly string[]): string | null {
  if (!Number.isInteger(roundNumber) || roundNumber < 1) return null;
  return roundMonths[roundNumber - 1] ?? null;
}

export function getRoundDateRange(month: string): RoundDateRange {
  const match = month.match(/^(\d{4})-(\d{2})$/);
  if (!match) {
    throw new Error(`Invalid month format: ${month}`);
  }

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

  return {
    month,
    startDate: new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0)).toISOString(),
    endDate: new Date(Date.UTC(year, monthIndex, lastDay, 23, 59, 59, 999)).toISOString(),
  };
}

export function getRoundTiming(
  month: string,
  now: Date,
  hasDistribution: boolean,
): RoundTiming {
  const { startDate, endDate } = getRoundDateRange(month);
  const startMs = Date.parse(startDate);
  const endMs = Date.parse(endDate);
  const nowMs = now.getTime();
  const isCurrent = nowMs >= startMs && nowMs <= endMs;

  if (hasDistribution) {
    return {
      status: "paid",
      distributionDataStatus: "available",
      isCurrent,
      percentComplete: isCurrent ? getLivePercentComplete(month, now) : 100,
      daysRemaining: isCurrent ? getLiveDaysRemaining(month, now) : 0,
    };
  }

  if (isCurrent) {
    return {
      status: "live",
      distributionDataStatus: "in_progress",
      isCurrent: true,
      percentComplete: getLivePercentComplete(month, now),
      daysRemaining: getLiveDaysRemaining(month, now),
    };
  }

  if (nowMs > endMs) {
    return {
      status: "ended",
      distributionDataStatus: "missing",
      isCurrent: false,
      percentComplete: 100,
      daysRemaining: 0,
    };
  }

  return {
    status: "upcoming",
    distributionDataStatus: "not_started",
    isCurrent: false,
    percentComplete: 0,
    daysRemaining: null,
  };
}

function getLivePercentComplete(month: string, now: Date): number {
  const [, monthText] = month.split("-");
  const monthIndex = Number(monthText) - 1;
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), monthIndex + 1, 0)).getUTCDate();
  return Math.min(100, Math.max(0, Math.round((now.getUTCDate() / lastDay) * 100)));
}

function getLiveDaysRemaining(month: string, now: Date): number {
  const [, monthText] = month.split("-");
  const monthIndex = Number(monthText) - 1;
  const lastDay = new Date(Date.UTC(now.getUTCFullYear(), monthIndex + 1, 0)).getUTCDate();
  return Math.max(0, lastDay - now.getUTCDate());
}
