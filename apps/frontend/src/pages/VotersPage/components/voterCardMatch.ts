/**
 * Pure presentation mapping for the VoterCard match display (DEV-941).
 *
 * Keeps the "what does this match look like on the card" logic out of the React
 * component so every bucket / edge case is unit-testable in isolation. The
 * component just renders the returned `{ variant, subtitle, statValue }` and
 * picks colours from `variant`.
 *
 * Match bucketing is the SAME rule used across the app:
 *   >= 80% → strong (★) · 40–60% → partial · 20% → weak · 0% → none
 * Because a selection is 5 words, `percent` is always one of 0/20/40/60/80/100,
 * so the `>=` thresholds collapse to those exact buckets.
 */
import type { MatchScore } from '@ens-dis/domain'

/** Qualitative buckets for a real (both-sides-selected) match score. */
export type MatchBucket = 'strong' | 'partial' | 'weak' | 'none'

/**
 * Card display variants. The four match buckets above, plus the two
 * "no comparison possible" states:
 *  - `unranked`  — the delegate hasn't picked their priorities.
 *  - `unpicked`  — the viewer (holder) hasn't picked theirs yet.
 */
export type MatchVariant = MatchBucket | 'unranked' | 'unpicked'

/** Percentage thresholds — exported so callers/tests share one source of truth. */
export const MATCH_BUCKET_THRESHOLDS = {
  strong: 80,
  partial: 40,
  weak: 20,
} as const

/**
 * Bucket a raw overlap percentage. Defensive against arbitrary inputs (clamps
 * via plain `>=`), though in practice `percent ∈ {0,20,40,60,80,100}`.
 */
export function matchBucket(percent: number): MatchBucket {
  if (percent >= MATCH_BUCKET_THRESHOLDS.strong) return 'strong'
  if (percent >= MATCH_BUCKET_THRESHOLDS.partial) return 'partial'
  if (percent >= MATCH_BUCKET_THRESHOLDS.weak) return 'weak'
  return 'none'
}

export interface VoterCardMatchDisplay {
  /** Drives the subtitle colour and the whole-card highlight. */
  variant: MatchVariant
  /** Subtitle line under the name (replaces the old truncated address). */
  subtitle: string
  /** Value shown in the "Match" stat slot (e.g. "80%", "–", "?"). */
  statValue: string
  /** Whole-card green highlight — only the strong / compatible variant. */
  highlight: boolean
}

interface VoterCardMatchArgs {
  /** Server-computed overlap; null when either side hasn't selected. */
  match: MatchScore | null | undefined
  /** Whether the connected viewer has picked their own values. */
  viewerHasSelected: boolean
  /** Whether THIS delegate has picked their values (voter.words != null). */
  delegateHasRanked: boolean
}

/**
 * Map the raw match state to everything the card needs to render. Order of
 * precedence matters:
 *  1. A non-null `match` means BOTH sides ranked (the server only computes it
 *     then) → bucket the percentage. This is the only path that highlights.
 *  2. Viewer hasn't picked → "Rank to see your match" ("?"). If the delegate
 *     also hasn't ranked, surface that instead (the more permanent blocker).
 *  3. Viewer picked but the delegate hasn't → "didn't rank" ("–").
 */
export function voterCardMatchDisplay({
  match,
  viewerHasSelected,
  delegateHasRanked,
}: VoterCardMatchArgs): VoterCardMatchDisplay {
  // 1. Both ranked → score is present → bucket it.
  if (match) {
    return bucketDisplay(match)
  }

  // 2. Viewer hasn't picked. Nudge them to rank — unless the delegate hasn't
  // ranked either, in which case there'd be nothing to match against anyway.
  if (!viewerHasSelected) {
    if (!delegateHasRanked) {
      return {
        variant: 'unranked',
        subtitle: "Delegate didn't rank priorities",
        statValue: '?',
        highlight: false,
      }
    }
    return {
      variant: 'unpicked',
      subtitle: 'Rank to see your match',
      statValue: '?',
      highlight: false,
    }
  }

  // 3. Viewer picked, but no score → the delegate hasn't ranked.
  return {
    variant: 'unranked',
    subtitle: "Delegate didn't rank priorities",
    statValue: '–',
    highlight: false,
  }
}

/** Bucket a present score into the strong/partial/weak/none display. */
function bucketDisplay(match: MatchScore): VoterCardMatchDisplay {
  const bucket = matchBucket(match.percent)
  const statValue = `${match.percent}%`

  switch (bucket) {
    case 'strong':
      return {
        variant: 'strong',
        subtitle: '⭐ Strong match',
        statValue,
        highlight: true,
      }
    case 'partial':
      return {
        variant: 'partial',
        subtitle: 'Partial match',
        statValue,
        highlight: false,
      }
    case 'weak':
      return {
        variant: 'weak',
        subtitle: 'Weak match',
        statValue,
        highlight: false,
      }
    case 'none':
    default:
      return {
        variant: 'none',
        subtitle: 'No shared priorities',
        statValue,
        highlight: false,
      }
  }
}
