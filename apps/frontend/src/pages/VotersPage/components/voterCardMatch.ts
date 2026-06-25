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
import { tokens } from '@/styles'

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
  /** Still drives the subtitle font-weight + the weak differ-list, and is kept
   *  so callers can branch on the bucket. The colour is pre-resolved (`color`). */
  variant: MatchVariant
  /** Subtitle line under the name (replaces the old truncated address). */
  subtitle: string
  /** Pre-resolved subtitle colour token for this variant. */
  color: string
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
 * Per-variant presentation: the subtitle copy, its colour, and whether this
 * variant highlights the whole card. Keyed by variant so it is the single
 * source of truth, and the `Record<MatchVariant, …>` makes it exhaustive — a
 * new variant won't compile until it has a row (no silent `default` to swallow
 * it). `color` folds in what used to be a second variant switch in the view.
 */
const VARIANT_DISPLAY: Record<
  MatchVariant,
  { subtitle: string; highlight: boolean; color: string }
> = {
  strong: { subtitle: '⭐ Strong match', highlight: true, color: tokens.color.status.success.fg },
  partial: { subtitle: 'Partial match', highlight: false, color: tokens.color.blue },
  weak: { subtitle: 'Weak match', highlight: false, color: tokens.color.textSecondary },
  none: { subtitle: 'No shared priorities', highlight: false, color: tokens.color.textSecondary },
  unranked: { subtitle: "Delegate didn't rank priorities", highlight: false, color: tokens.color.textSecondary },
  unpicked: { subtitle: 'Rank to see your match', highlight: false, color: tokens.color.textSecondary },
}

/**
 * Assemble the full display descriptor. `variant` fixes the subtitle + card
 * highlight (via {@link VARIANT_DISPLAY}); `statValue` is the only piece that
 * varies independently of the variant (e.g. "80%" vs "?" vs "–").
 */
function display(variant: MatchVariant, statValue: string): VoterCardMatchDisplay {
  return { variant, statValue, ...VARIANT_DISPLAY[variant] }
}

/**
 * Map the raw match state to everything the card needs to render. Order of
 * precedence matters:
 *  1. A non-null `match` means BOTH sides ranked (the server only computes it
 *     then) → bucket the percentage. This is the only path that highlights.
 *  2. Viewer hasn't picked → "?" stat. If the delegate hasn't ranked either,
 *     surface that ("unranked") rather than the rank-nudge ("unpicked"), since
 *     there'd be nothing to match against anyway.
 *  3. Viewer picked but the delegate hasn't (or a defensive no-score) → the
 *     "didn't rank" state with a "–" stat.
 */
export function voterCardMatchDisplay({
  match,
  viewerHasSelected,
  delegateHasRanked,
}: VoterCardMatchArgs): VoterCardMatchDisplay {
  if (match) return display(matchBucket(match.percent), `${match.percent}%`)
  if (!viewerHasSelected) return display(delegateHasRanked ? 'unpicked' : 'unranked', '?')
  return display('unranked', '–')
}
