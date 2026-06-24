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
 * Map a shared-word count (0–SELECTION_COUNT) to the card's match visuals.
 *
 * Ring colour: 100 green · 80/60 blue · 20 muted · 0 grey.
 * Bucket:      ≥80 Strong (★) · 40–60 Partial · 20 Weak · 0 None.
 *
 * `sharedCount` is clamped into [0, SELECTION_COUNT] defensively so an
 * unexpected value never produces a percentage outside 0–100.
 */
export function matchLevel(sharedCount: number): MatchLevel {
  const shared = Math.max(0, Math.min(SELECTION_COUNT, Math.trunc(sharedCount)))
  const ringPercent = Math.round((shared / SELECTION_COUNT) * 100)

  // 5/5 — perfect overlap.
  if (ringPercent >= 100) {
    return {
      ringPercent,
      ringColor: tokens.color.green,
      tier: 'strong',
      pillLabel: 'Strong match',
      showStar: true,
      differLayout: 'none',
    }
  }

  // 4/5 — still Strong, but now there are differing words to show.
  if (ringPercent >= 80) {
    return {
      ringPercent,
      ringColor: tokens.color.blue,
      tier: 'strong',
      pillLabel: 'Strong match',
      showStar: true,
      differLayout: 'side-by-side',
    }
  }

  // 3/5 and 2/5 — Partial. Same side-by-side differ layout.
  if (ringPercent >= 40) {
    return {
      ringPercent,
      ringColor: tokens.color.blue,
      tier: 'partial',
      pillLabel: 'Partial match',
      showStar: false,
      differLayout: 'side-by-side',
    }
  }

  // 1/5 — Weak. The four non-shared words stack ("the other 4").
  if (ringPercent >= 20) {
    return {
      ringPercent,
      ringColor: tokens.color.textMuted,
      tier: 'weak',
      pillLabel: 'Weak match',
      showStar: false,
      differLayout: 'stacked',
    }
  }

  // 0/5 — no shared values; show what the delegate stands for.
  return {
    ringPercent,
    ringColor: tokens.color.border,
    tier: 'none',
    pillLabel: 'No shared values',
    showStar: false,
    differLayout: 'delegate-only',
  }
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
