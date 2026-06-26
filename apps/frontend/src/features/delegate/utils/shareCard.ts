/**
 * Helpers for building the X share URL and the OG card-image URL for a voter
 * profile. Kept in one place so the in-app card preview and the link that gets
 * shared always point at the same image (preview == unfurl).
 */

interface ShareTarget {
  address: string
  ensName?: string | null
}

function safeOrigin(): string {
  return typeof window === 'undefined' ? '' : window.location.origin
}

/**
 * Public profile URL. Crawlers hitting this path get per-delegate OG tags
 * (see api/voter-html.ts), so it unfurls into the delegate card on X.
 * Prefers the ENS name over the raw address when available.
 */
export function buildVoterShareUrl({ address, ensName }: ShareTarget): string {
  const id = ensName ?? address
  return `${safeOrigin()}/voters/${encodeURIComponent(id)}`
}

/**
 * Post-delegation share URL for a holder. Crawlers get the holder card OG tags
 * (see api/holder-html.ts); humans are redirected to the landing page by the
 * SPA route (the holder isn't necessarily a delegate, so there's no profile to
 * show). Prefers the ENS name over the raw address.
 */
export function buildHolderShareUrl({ address, ensName }: ShareTarget): string {
  const id = ensName ?? address
  return `${safeOrigin()}/share/holder/${encodeURIComponent(id)}`
}

/**
 * The OG card image endpoint — the exact same image the link unfurl renders,
 * reused for the in-app preview. Passing `name` lets the renderer fetch the
 * ENS avatar; otherwise it falls back to the address + initials.
 */
export function buildVoterOgImageUrl({
  address,
  ensName,
  variant = 'delegate',
}: ShareTarget & { variant?: 'delegate' | 'holder' }): string {
  const params = new URLSearchParams()
  params.set('variant', variant)
  if (ensName) params.set('name', ensName)
  else params.set('address', address)
  return `${safeOrigin()}/api/og/voter?${params.toString()}`
}
