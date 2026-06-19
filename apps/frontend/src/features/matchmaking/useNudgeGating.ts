import { useCallback, useState } from 'react'
import { useSelectionState } from './useSelectionState'

/**
 * Centralized re-engagement nudge gating, consumed by /voters (FE-4), delegate
 * profiles (FE-5), and the Dashboard (FE-6) so the rule stays consistent:
 *
 *  - not selected + NOT yet dismissed → auto-show the Pitch
 *  - not selected + dismissed         → show the quieter inline nudge/banner
 *
 * Dismissal is EPHEMERAL (in-memory, per mount): "Not now" hides the pitch for
 * the current visit only — it re-opens on the next visit/reload until the user
 * actually selects. (Changed 2026-06-19 from session-scoped sessionStorage: the
 * pitch should keep prompting every visit, not just once per browser session.)
 */
export function useNudgeGating() {
  const { state } = useSelectionState()
  const connectedNotSelected = state === 'connected-not-selected'
  const [dismissed, setDismissed] = useState(false)

  const dismiss = useCallback(() => setDismissed(true), [])

  return {
    connectedNotSelected,
    dismissed,
    shouldAutoOpenPitch: connectedNotSelected && !dismissed,
    shouldShowNudge: connectedNotSelected && dismissed,
    dismiss,
  }
}
