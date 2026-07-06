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

/**
 * Error text safe to attach to analytics events. Hex identifiers (wallet
 * addresses, tx hashes) are scrubbed BEFORE truncating — wallet errors often
 * embed the sender address in the message ("Request Arguments: from: 0x…"),
 * and the privacy page promises the connected wallet address is never sent
 * to analytics.
 */
export function errorMessageForAnalytics(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err)
  return raw.replace(/0x[a-fA-F0-9]{6,}/g, '0x…').slice(0, 160)
}
