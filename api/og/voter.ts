import { ImageResponse } from '@vercel/og'
import { renderVoterCard } from './voter-render.js'

export const config = {
  runtime: 'edge',
}

// Hard cap on avatar payload size. IPFS-served ENS avatars can be many MB,
// which blows up once base64-inlined into the rendered HTML and exhausts the
// edge function's memory budget. 2 MB is generous for a 180px avatar.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024

/* ─── Helpers ─── */

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function initialsForAddress(addr: string): string {
  return addr.slice(2, 4).toUpperCase()
}

function stripEnsTld(name: string): string {
  // Drop the trailing TLD (.eth, .xyz, .box, …) for visual density.
  return name.replace(/\.[a-z0-9-]{2,}$/i, '')
}

/* ─── Satoshi font loading ─── */
// Satori (which @vercel/og uses) only accepts TTF/OTF/WOFF — NOT WOFF2.
// Fontshare only serves WOFF2, so we pull Satoshi from a public GitHub mirror
// via jsDelivr (which serves the raw .ttf bytes directly).
// Cache the font promises at module scope so subsequent invocations on the
// same edge instance reuse them instead of re-fetching on every render.
type FontPromise = Promise<ArrayBuffer | null>
let satoshiBoldPromise: FontPromise | null = null
let satoshiMediumPromise: FontPromise | null = null

const SATOSHI_URLS: Record<500 | 700, string> = {
  500: 'https://cdn.jsdelivr.net/gh/webbycrown/golife-span-statamic-theme@main/public/assets/fonts/Satoshi-Medium.ttf',
  700: 'https://cdn.jsdelivr.net/gh/webbycrown/golife-span-statamic-theme@main/public/assets/fonts/Satoshi-Bold.ttf',
}

async function loadSatoshiWeight(weight: 500 | 700): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(SATOSHI_URLS[weight])
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return buf.byteLength > 0 ? buf : null
  } catch {
    return null
  }
}

function getSatoshi(weight: 500 | 700): FontPromise {
  if (weight === 700) {
    if (satoshiBoldPromise) return satoshiBoldPromise
    const p = loadSatoshiWeight(700)
    satoshiBoldPromise = p
    // If the fetch ultimately failed, drop the cached promise so a future
    // request on this warm edge instance can retry (avoids a permanent
    // null cache after a transient jsDelivr blip).
    void p.then((result) => {
      if (result === null && satoshiBoldPromise === p) satoshiBoldPromise = null
    })
    return p
  }
  if (satoshiMediumPromise) return satoshiMediumPromise
  const p = loadSatoshiWeight(500)
  satoshiMediumPromise = p
  void p.then((result) => {
    if (result === null && satoshiMediumPromise === p) satoshiMediumPromise = null
  })
  return p
}

/* ─── Avatar resolution ─── */
// Fetch the avatar bytes ourselves and embed as a data URL. Letting Satori
// fetch the URL itself works in Node but fails on Vercel's edge — likely a
// content-type / redirect handling difference in Satori's image loader.
interface AvatarFetchResult {
  dataUrl: string | null
  diagnostic: string
}

async function fetchAvatarDataUrl(name: string): Promise<AvatarFetchResult> {
  const url = `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 8000)
    let res: Response
    try {
      res = await fetch(url, {
        signal: controller.signal,
        redirect: 'follow',
        headers: { 'user-agent': 'ens-incentives-og/1.0', accept: 'image/*' },
      })
    } finally {
      clearTimeout(timer)
    }
    if (!res.ok) return { dataUrl: null, diagnostic: `status=${res.status}` }
    const contentType = res.headers.get('content-type') ?? 'image/png'
    if (!contentType.startsWith('image/')) {
      return { dataUrl: null, diagnostic: `bad content-type=${contentType}` }
    }
    // Cheap pre-check via content-length when the server advertises it. Saves
    // us from buffering a multi-MB body just to throw it away.
    const contentLengthHeader = res.headers.get('content-length')
    if (contentLengthHeader) {
      const advertised = Number.parseInt(contentLengthHeader, 10)
      if (Number.isFinite(advertised) && advertised > MAX_AVATAR_BYTES) {
        return {
          dataUrl: null,
          diagnostic: `too large (content-length=${advertised} > ${MAX_AVATAR_BYTES})`,
        }
      }
    }
    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0) return { dataUrl: null, diagnostic: 'empty body' }
    // Enforce the cap on actual bytes too — servers can omit or lie about
    // content-length (chunked transfer encoding, misconfigured IPFS gateways).
    if (buf.byteLength > MAX_AVATAR_BYTES) {
      return {
        dataUrl: null,
        diagnostic: `too large (bytes=${buf.byteLength} > ${MAX_AVATAR_BYTES})`,
      }
    }
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return {
      dataUrl: `data:${contentType};base64,${btoa(binary)}`,
      diagnostic: `ok bytes=${buf.byteLength} type=${contentType}`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { dataUrl: null, diagnostic: `fetch threw: ${message}` }
  }
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawName = searchParams.get('name')?.trim()
  const rawAddress = searchParams.get('address')?.trim()

  const name = rawName && !isAddress(rawName) ? rawName : null
  const address = rawAddress && isAddress(rawAddress)
    ? rawAddress
    : (rawName && isAddress(rawName) ? rawName : null)

  const displayName = name
    ? stripEnsTld(name)
    : address
      ? truncateAddress(address)
      : 'ENS Delegate'
  const initials = address ? initialsForAddress(address) : 'EN'

  // Fetch avatar bytes + fonts in parallel
  const [avatarResult, satoshiBold, satoshiMedium] = await Promise.all([
    name
      ? fetchAvatarDataUrl(name)
      : Promise.resolve({ dataUrl: null, diagnostic: 'no name' } as AvatarFetchResult),
    getSatoshi(700),
    getSatoshi(500),
  ])
  const avatarUrl = avatarResult.dataUrl

  // Debug mode — return diagnostic JSON instead of the image
  if (searchParams.get('debug') === '1') {
    return new Response(
      JSON.stringify(
        {
          name,
          address,
          avatar: {
            attemptedUrl: name
              ? `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
              : null,
            diagnostic: avatarResult.diagnostic,
            embeddedBytes: avatarResult.dataUrl?.length ?? 0,
          },
          fonts: {
            satoshiBold: satoshiBold ? `${satoshiBold.byteLength} bytes` : 'missing',
            satoshiMedium: satoshiMedium ? `${satoshiMedium.byteLength} bytes` : 'missing',
          },
        },
        null,
        2,
      ),
      { headers: { 'content-type': 'application/json' } },
    )
  }

  type FontEntry = {
    name: string
    data: ArrayBuffer
    style: 'normal' | 'italic'
    weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
  }
  const fonts: FontEntry[] = []
  if (satoshiBold) {
    fonts.push({ name: 'Satoshi', data: satoshiBold, style: 'normal', weight: 700 })
  }
  if (satoshiMedium) {
    fonts.push({ name: 'Satoshi', data: satoshiMedium, style: 'normal', weight: 500 })
  }

  // ImageResponse uses Inter by default — only override if Satoshi loaded.
  const responseOptions = {
    width: 1200,
    height: 630,
    headers: {
      'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
    },
    ...(fonts.length > 0 ? { fonts } : {}),
  } as const

  return new ImageResponse(
    renderVoterCard({
      displayName,
      initials,
      avatarUrl,
      satoshiLoaded: fonts.length > 0,
    }),
    responseOptions,
  )
}
