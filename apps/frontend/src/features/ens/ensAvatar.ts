import { useEffect, useState } from 'react'

/**
 * ENS metadata service avatar endpoint. Avatars are resolved server-side
 * because client-side resolution (wagmi's useEnsAvatar) breaks on NFT
 * avatar records hosted by the OpenSea Shared Storefront: their tokenURI
 * points at the deprecated OpenSea v1 API, which sends no CORS headers.
 * Returns 404 when the name has no avatar record.
 */
export function ensMetadataAvatarUrl(name: string): string {
  return `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
}

/**
 * Probes the metadata service for `name` and returns the avatar URL only
 * once the image is known to load, so callers can fall back (e.g. to a
 * blockie) instead of rendering a broken image on 404.
 */
export function useVerifiedEnsAvatar(name: string | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    setUrl(null)
    if (!name) return
    let cancelled = false
    const candidate = ensMetadataAvatarUrl(name)
    const probe = new Image()
    probe.onload = () => {
      if (!cancelled) setUrl(candidate)
    }
    probe.src = candidate
    return () => {
      cancelled = true
    }
  }, [name])

  return url
}
