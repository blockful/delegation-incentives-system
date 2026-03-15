/**
 * Round configuration.
 *
 * Set ROUND_MONTHS=2026-03,2026-04,2026-05 in .env to restrict distribution
 * computation to specific months. If unset, all valid YYYY-MM months are allowed.
 */

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/

export function parseRoundMonths(raw: string | undefined): Set<string> | null {
  if (!raw || raw.trim() === "") return null
  const months = raw.split(",").map((s) => s.trim())
  for (const m of months) {
    if (!MONTH_RE.test(m)) {
      throw new Error(`Invalid ROUND_MONTHS value: "${m}" — expected YYYY-MM format`)
    }
  }
  return new Set(months)
}

/** Configured round months, or null if unrestricted. */
export const ROUND_MONTHS: Set<string> | null = parseRoundMonths(process.env.ROUND_MONTHS)

/** Returns true if the given month is a valid round (or rounds are unconfigured). */
export function isConfiguredRound(month: string): boolean {
  return ROUND_MONTHS === null || ROUND_MONTHS.has(month)
}

/** Returns the sorted list of configured months, or null if unconfigured. */
export function getConfiguredRounds(): string[] | null {
  return ROUND_MONTHS === null ? null : [...ROUND_MONTHS].sort()
}
