/**
 * In-memory ENS name cache.
 *
 * Resolves Ethereum addresses to their primary ENS names using the EFP API
 * (https://api.ethfollow.xyz). Results are cached with a TTL to avoid hammering
 * the API on every request. Cache misses return null immediately and trigger a
 * background fetch so subsequent requests are served instantly.
 *
 * Concurrency is capped to avoid rate-limit issues when many addresses need
 * resolving at the same time (e.g. on cold start).
 */

const ENS_API_BASE = "https://api.ethfollow.xyz/api/v1"
const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6 hours — ENS names change rarely
const REQUEST_TIMEOUT_MS = 5_000
const CONCURRENCY = 5

interface CacheEntry {
  name: string | null
  avatar: string | null
  cachedAt: number
}

const cache = new Map<string, CacheEntry>()

/** Return the cached ENS name for an address, or null if not yet resolved. */
export function getCachedEnsName(address: string): string | null {
  return cache.get(address.toLowerCase())?.name ?? null
}

/** Return the cached avatar URL for an address, or null if not yet resolved. */
export function getCachedAvatarUrl(address: string): string | null {
  return cache.get(address.toLowerCase())?.avatar ?? null
}

/**
 * Fetch ENS names for all stale/missing addresses and populate the cache.
 * Processes addresses in batches of CONCURRENCY to avoid rate-limiting.
 * Errors are swallowed — a failed lookup caches null to prevent retry storms.
 */
export async function prefetchEnsNames(addresses: string[]): Promise<void> {
  const now = Date.now()
  const stale = addresses.filter((addr) => {
    const entry = cache.get(addr.toLowerCase())
    return !entry || now - entry.cachedAt > CACHE_TTL_MS
  })

  if (stale.length === 0) return

  for (let i = 0; i < stale.length; i += CONCURRENCY) {
    const chunk = stale.slice(i, i + CONCURRENCY)
    await Promise.allSettled(chunk.map(resolveAndCache))
  }
}

async function resolveAndCache(address: string): Promise<void> {
  const key = address.toLowerCase()
  try {
    const res = await fetch(`${ENS_API_BASE}/users/${address}/ens`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      cache.set(key, { name: null, avatar: null, cachedAt: Date.now() })
      return
    }
    const data = (await res.json()) as { name?: string; avatar?: string }
    cache.set(key, { name: data.name ?? null, avatar: data.avatar ?? null, cachedAt: Date.now() })
  } catch {
    cache.set(key, { name: null, avatar: null, cachedAt: Date.now() })
  }
}

/** Directly inject an entry — used in tests and for Ponder-indexed aliases. */
export function setCachedEnsName(address: string, name: string | null, avatar?: string | null): void {
  cache.set(address.toLowerCase(), { name, avatar: avatar ?? null, cachedAt: Date.now() })
}

/** Clear all entries — used in tests. */
export function clearEnsCache(): void {
  cache.clear()
}
