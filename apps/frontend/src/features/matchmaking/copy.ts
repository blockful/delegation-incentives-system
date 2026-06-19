import type { ViewerRole } from './useViewerRole'

/**
 * Role-specific copy for the Pitch and Confirm steps. ⚠️ Placeholder pending the
 * copy pass (spec Open Question) — wording mirrors the spec's Confirm frames.
 * Everything else in the flow is role-agnostic.
 */
export const pitchCopy: Record<ViewerRole, { title: string; body: string; cta: string }> = {
  holder: {
    title: 'Find delegates who share your priorities',
    body: "Pick the values that matter most to you. We'll sort the voters list by how well each delegate matches you.",
    cta: 'Select values',
  },
  delegate: {
    title: 'Tell holders what you stand for',
    body: 'Pick the values that define your delegation. Holders will see how well you match their priorities on your profile.',
    cta: 'Select values',
  },
}

export const confirmCopy: Record<ViewerRole, { title: string; body: string; cta: string }> = {
  holder: {
    title: 'Your values are set',
    body: 'The voters list is now sorted by how well each delegate matches you.',
    cta: 'View matches',
  },
  delegate: {
    title: "You're all set",
    body: 'Your values are now on your public profile.',
    cta: 'View my profile',
  },
}

/** Confirm-modal count pill, shown only when n > 0. */
export function matchPillText(role: ViewerRole, n: number): string {
  return role === 'holder'
    ? `${n} delegate${n === 1 ? '' : 's'} closely match you`
    : `${n} holder${n === 1 ? '' : 's'} match your priorities so far`
}
