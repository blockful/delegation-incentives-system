import type { RewardStatus, RoundStatus } from '@/api/types'
import { formatEnsAmount } from '@/utils/format'

/** Human-readable label for a round or reward status. */
export function statusLabel(status: RoundStatus | RewardStatus): string {
  if (status === 'live') return 'Ongoing'
  if (status === 'paid') return 'Complete'
  if (status === 'pending') return 'Pending'
  if (status === 'not_eligible') return 'Not eligible'
  if (status === 'no_reward') return 'No payout'
  if (status === 'unavailable') return 'Unavailable'
  return 'Ended'
}

/**
 * Format a positive-only ENS reward as a signed string ("+0.1234"). Returns
 * `null` for missing / zero / negative values — callers render their own
 * empty sentinel (e.g. "—") so the table styling stays consistent.
 */
export function formatPositiveReward(value: string | null | undefined): string | null {
  if (!value) return null
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return null
  return `+${formatEnsAmount(value, { maximumFractionDigits: 4 })}`
}
