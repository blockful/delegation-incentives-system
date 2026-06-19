import { useCallback, useState } from 'react'
import { useSelectionState } from './useSelectionState'

const SESSION_KEY = 'matchmaking:pitch-dismissed'

function readDismissed(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === '1'
  } catch {
    return false
  }
}

function writeDismissed(): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(SESSION_KEY, '1')
  } catch {
    /* sessionStorage unavailable — fall back to in-memory state only */
  }
}

/**
 * Centralized re-engagement nudge gating, consumed by /voters (FE-4), delegate
 * profiles (FE-5), and the Dashboard (FE-6) so the rule stays consistent:
 *
 *  - connected + not selected + NOT yet dismissed → auto-show the Pitch
 *  - connected + not selected + dismissed         → show inline nudges/banners
 *
 * "Fresh session" (Q#8 default) = a browser session, tracked in sessionStorage —
 * so the Pitch re-opens on the next visit in a new session, not on every mount.
 */
export function useNudgeGating() {
  const { state } = useSelectionState()
  const connectedNotSelected = state === 'connected-not-selected'
  const [dismissed, setDismissed] = useState(readDismissed)

  const dismiss = useCallback(() => {
    writeDismissed()
    setDismissed(true)
  }, [])

  return {
    connectedNotSelected,
    dismissed,
    shouldAutoOpenPitch: connectedNotSelected && !dismissed,
    shouldShowNudge: connectedNotSelected && dismissed,
    dismiss,
  }
}
