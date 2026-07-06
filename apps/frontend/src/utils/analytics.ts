/**
 * Thin wrapper around the Umami tracker loaded globally in index.html
 * (cloud.umami.is/script.js). Umami attaches `window.umami` once its script
 * runs; it can be absent (blocked by an ad-blocker, still loading, or in SSR/
 * test environments), so every call is guarded and never throws.
 *
 * Usage: trackEvent('voters_delegate_click', { delegate, wallet })
 */
type UmamiTracker = {
  track: (eventName: string, eventData?: Record<string, unknown>) => void
}

declare global {
  interface Window {
    umami?: UmamiTracker
  }
}

export function trackEvent(eventName: string, eventData?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return
  try {
    window.umami?.track(eventName, eventData)
  } catch {
    // Analytics must never break the app — swallow any tracker error.
  }
}
