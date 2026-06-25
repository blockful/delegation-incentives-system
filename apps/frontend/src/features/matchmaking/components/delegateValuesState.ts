import { SELECTION_COUNT } from '@ens-dis/domain'
import { tokens } from '@/styles'

/**
 * Pure presentation logic for the delegate-profile "Values" card.
 *
 * Two responsibilities, both kept side-effect-free so they can be unit-tested
 * without rendering:
 *  - `matchLevel(sharedCount)`  — the graduated match visuals (ring %, ring
 *    colour, pill label, and how the "differ" list is laid out).
 *  - `resolveCardState(...)`    — which of the 7 viewer × delegate states the
 *    card is in, evaluated in a fixed precedence order.
 */

/** How the non-shared words are arranged below the ring, per match level. */
export type DifferLayout =
  /** All 5 shared — nothing differs. */
  | 'none'
  /** Delegate-unique vs your-unique, in two columns ("You differ on"). */
  | 'side-by-side'
  /** Delegate-unique then your-unique, stacked ("You differ on the other 4"). */
  | 'stacked'
  /** No overlap — surface the delegate's own 5 values instead. */
  | 'delegate-only'

/** The unified match bucket (drives the pill label + whether the ★ shows). */
export type MatchTier = 'strong' | 'partial' | 'weak' | 'none'

export interface MatchLevel {
  /** Overlap as a percentage of SELECTION_COUNT (e.g. 4/5 → 80). */
  ringPercent: number
  /** Ring stroke colour for this level. */
  ringColor: string
  /** Bucket — Strong (★) ≥80 · Partial 40–60 · Weak 20 · None 0. */
  tier: MatchTier
  /** Human label shown in the graduated pill. */
  pillLabel: string
  /** Whether the pill leads with a ★ (Strong only). */
  showStar: boolean
  /** How to render the non-shared words. */
  differLayout: DifferLayout
}

/**
 * One match band: an inclusive lower %-bound plus the visuals for that band.
 * Split out as data so {@link matchLevel} is a table lookup, not a 5-arm ladder.
 */
interface MatchBand {
  /** Inclusive lower bound on ringPercent; matchLevel takes the first band met. */
  min: number
  level: Omit<MatchLevel, 'ringPercent'>
}

/**
 * Match bands, highest first — read top-to-bottom as the Figma set.
 *
 * The two groupings differ ON PURPOSE: `tier` / `pillLabel` / `showStar` bucket
 * {100, 80} together as Strong, but `ringColor` / `differLayout` give 100 its
 * own band (green, nothing differs) while 80 joins 60/40 (blue, side-by-side).
 * Keep these as explicit rows — do NOT collapse to a single tier-keyed map, or
 * the 100-vs-80 distinction is lost.
 */
const MATCH_BANDS: readonly MatchBand[] = [
  { min: 100, level: { ringColor: tokens.color.green, tier: 'strong', pillLabel: 'Strong match', showStar: true, differLayout: 'none' } },
  { min: 80, level: { ringColor: tokens.color.blue, tier: 'strong', pillLabel: 'Strong match', showStar: true, differLayout: 'side-by-side' } },
  { min: 40, level: { ringColor: tokens.color.blue, tier: 'partial', pillLabel: 'Partial match', showStar: false, differLayout: 'side-by-side' } },
  { min: 20, level: { ringColor: tokens.color.textMuted, tier: 'weak', pillLabel: 'Weak match', showStar: false, differLayout: 'stacked' } },
  { min: 0, level: { ringColor: tokens.color.border, tier: 'none', pillLabel: 'No shared values', showStar: false, differLayout: 'delegate-only' } },
]

/**
 * Map a shared-word count (0–SELECTION_COUNT) to the card's match visuals.
 *
 * `sharedCount` is clamped into [0, SELECTION_COUNT] defensively so an
 * unexpected value never produces a percentage outside 0–100; the `min: 0` band
 * guarantees a match.
 */
export function matchLevel(sharedCount: number): MatchLevel {
  const shared = Math.max(0, Math.min(SELECTION_COUNT, Math.trunc(sharedCount)))
  const ringPercent = Math.round((shared / SELECTION_COUNT) * 100)
  const { level } = MATCH_BANDS.find((band) => ringPercent >= band.min)!
  return { ringPercent, ...level }
}

/** The 7 mutually exclusive states the card can render. */
export type CardStateKey =
  /** Own profile, values set → "Your values" + chips + Edit. */
  | 'own-selected'
  /** Own profile, no values → "missing values" → Complete profile. */
  | 'own-unselected'
  /** No viewer wallet → Connect prompt. */
  | 'logged-out'
  /** Neither side picked → "Start matching" nudge. */
  | 'neither-picked'
  /** Viewer hasn't picked, delegate has → locked match prompt (gated; no chips). */
  | 'viewer-unselected'
  /** Viewer picked, delegate hasn't → "hasn't set their values yet". */
  | 'delegate-unselected'
  /** Both picked → the ring + graduated pill + shared/differ layout. */
  | 'both-picked'

export interface CardStateInput {
  isOwnProfile: boolean
  /** undefined when logged out. */
  viewerAddress: string | undefined
  viewerSelected: boolean
  delegateSelected: boolean
}

/**
 * Resolve the card state. Order matters — earlier branches win:
 *  1. own profile (selected vs not)
 *  2. logged out
 *  3. neither picked
 *  4. holder not picked + delegate picked  (the gate)
 *  5. viewer picked + delegate not picked
 *  6. both picked
 *
 * `isOwnProfile` is only ever true for a connected viewer, so the own-profile
 * branch is checked before the logged-out branch without conflict.
 */
export function resolveCardState({
  isOwnProfile,
  viewerAddress,
  viewerSelected,
  delegateSelected,
}: CardStateInput): CardStateKey {
  if (isOwnProfile) {
    return viewerSelected ? 'own-selected' : 'own-unselected'
  }

  if (!viewerAddress) return 'logged-out'

  if (!viewerSelected) {
    // Neither picked vs delegate-only-picked: both keep the viewer's values
    // hidden behind a "pick yours first" gate, but the copy differs.
    return delegateSelected ? 'viewer-unselected' : 'neither-picked'
  }

  // Viewer has picked from here on.
  if (!delegateSelected) return 'delegate-unselected'

  return 'both-picked'
}
