import { ImageResponse } from '@vercel/og'
import { createElement as h, type ReactElement } from 'react'

export const config = {
  runtime: 'edge',
}

/* ─── Brand tokens (mirrors the Figma OG card design, node 5993:5666) ─── */

// The personal cards (delegate/holder) use ENS's deep brand blue as a solid
// fill — NOT the lighter #3889ff the app DS uses for buttons.
const ENS_BLUE = '#0082bb'
const WHITE = '#ffffff'

// Heading + CTA copy per card variant. The two personal cards share an
// identical layout and differ only in these two strings. `holder` is added by
// the stacked holder-share PR.
const VARIANT_COPY: Record<'delegate', { heading: string; cta: string }> = {
  delegate: {
    heading: 'I’m an active voter!',
    cta: 'Check my profile, delegate and earn rewards',
  },
}

// Hard cap on avatar payload size. IPFS-served ENS avatars can be many MB,
// which blows up once base64-inlined into the rendered HTML and exhausts the
// edge function's memory budget. 2 MB is generous for a 152px avatar.
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

function initialsForName(name: string): string {
  // Use the first two alphanumeric chars of the bare name (without TLD).
  // Falls back to 'EN' if the name has fewer than 2 usable chars.
  const bare = stripEnsTld(name).replace(/[^a-z0-9]/gi, '')
  return bare.length >= 2 ? bare.slice(0, 2).toUpperCase() : 'EN'
}

function stripEnsTld(name: string): string {
  // Drop the trailing TLD (.eth, .xyz, .box, …) when deriving initials.
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

// Generic same-origin image (e.g. the static "built by blockful" logo) → data
// URL. Satori on the edge can't reliably fetch a URL itself, so we inline the
// bytes. Returns null on any failure so the card can fall back gracefully.
async function fetchImageDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { accept: 'image/*' } })
    if (!res.ok) return null
    const contentType = res.headers.get('content-type') ?? 'image/png'
    if (!contentType.startsWith('image/')) return null
    const buf = await res.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > MAX_AVATAR_BYTES) return null
    const bytes = new Uint8Array(buf)
    let binary = ''
    const chunkSize = 0x8000
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
    }
    return `data:${contentType};base64,${btoa(binary)}`
  } catch {
    return null
  }
}

/* ─── SVG fragments ─── */

// The ENS mark, as four white paths on a 24×24 viewBox. Reused for the
// bottom-right logo on the personal cards.
const ENS_LOGO_PATHS: ReadonlyArray<string> = [
  'M4.00058 9.70969C4.23776 10.2167 4.82477 11.2188 4.82477 11.2188L11.611 0L4.98783 4.62508C4.59318 4.88836 4.2694 5.24473 4.04505 5.66275C3.7434 6.29338 3.58313 6.98229 3.57545 7.68131C3.56777 8.38033 3.71286 9.07259 4.00058 9.70969Z',
  'M1.31159 13.4038C1.38637 14.477 1.68956 15.5217 2.20086 16.4682C2.71216 17.4146 3.41976 18.2409 4.27629 18.8917L11.6021 24C11.6021 24 7.01863 17.3944 3.15267 10.8215C2.76128 10.1271 2.49816 9.36782 2.37592 8.58011C2.3218 8.22341 2.3218 7.86059 2.37592 7.50389C2.27512 7.69068 2.07945 8.07313 2.07945 8.07313C1.68745 8.87262 1.42049 9.72754 1.28787 10.608C1.21154 11.5388 1.21948 12.4745 1.31159 13.4038Z',
  'M20.0011 14.2903C19.7639 13.7833 19.1769 12.7812 19.1769 12.7812L12.3907 24L19.0138 19.3779C19.4085 19.1146 19.7322 18.7582 19.9566 18.3402C20.2587 17.7092 20.4192 17.0198 20.4269 16.3202C20.4346 15.6206 20.2892 14.9278 20.0011 14.2903Z',
  'M22.69 10.5962C22.6153 9.52304 22.3121 8.47827 21.8008 7.53183C21.2895 6.58539 20.5819 5.75911 19.7253 5.10834L12.3996 0C12.3996 0 16.98 6.60556 20.849 13.1785C21.2393 13.8731 21.5014 14.6324 21.6227 15.4199C21.6769 15.7766 21.6769 16.1394 21.6227 16.4961C21.7235 16.3093 21.9192 15.9269 21.9192 15.9269C22.3112 15.1274 22.5782 14.2725 22.7108 13.392C22.7881 12.4613 22.7812 11.5256 22.69 10.5962Z',
]

function rightArrow(size: number, color: string): ReactElement {
  return h(
    'svg',
    { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' },
    h('path', {
      d: 'M5 12h14M13 6l6 6-6 6',
      stroke: color,
      strokeWidth: 2.5,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
    }),
  )
}

function ensMarkWhite(width: number, height: number): ReactElement {
  return h(
    'svg',
    { width, height, viewBox: '0 0 24 24', fill: 'none' },
    ...ENS_LOGO_PATHS.map((d, i) => h('path', { key: i, d, fill: WHITE })),
  )
}

/* ─── Render ───
   Authored as React.createElement (aliased to h) rather than JSX so this
   file can keep its .ts extension. Vercel's zero-config function discovery
   only picks up .js/.mjs/.cjs/.ts in api/, and the edge bundler's resolver
   does NOT remap .js→.tsx — so a .tsx render sibling can't be imported
   reliably. Keeping everything inline sidesteps both issues. */

interface WrappedCardProps {
  heading: string
  cta: string
  displayName: string
  initials: string
  avatarUrl: string | null
  satoshiLoaded: boolean
}

// The "Wrapped"-style personal card: a white speech bubble (headline + CTA
// pill) over a brand-blue field, with an avatar / name / ENS-mark footer row.
function renderWrappedCard({
  heading,
  cta,
  displayName,
  initials,
  avatarUrl,
  satoshiLoaded,
}: WrappedCardProps): ReactElement {
  const bubble = h(
    'div',
    {
      style: {
        display: 'flex',
        flex: '1 0 0',
        minHeight: 0,
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 32,
        width: '100%',
        background: WHITE,
        borderRadius: 12,
        padding: '40px 48px',
      },
    },
    h(
      'span',
      {
        style: {
          fontSize: 92,
          fontWeight: 700,
          color: ENS_BLUE,
          lineHeight: 1.1,
          wordBreak: 'break-word',
        },
      },
      heading,
    ),
    h(
      'div',
      {
        style: {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          border: `2px solid ${ENS_BLUE}`,
          borderRadius: 100,
          padding: '12px 12px 12px 32px',
        },
      },
      h(
        'span',
        { style: { fontSize: 28, fontWeight: 700, color: ENS_BLUE, lineHeight: 1.2 } },
        cta,
      ),
      h(
        'div',
        {
          style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: ENS_BLUE,
            borderRadius: 100,
            padding: 16,
            flexShrink: 0,
          },
        },
        rightArrow(24, WHITE),
      ),
    ),
  )

  // Speech-bubble tail: a small triangle hanging off the bubble's lower-left.
  const tail = h(
    'div',
    { style: { display: 'flex', paddingLeft: 63 } },
    h(
      'svg',
      { width: 54, height: 32, viewBox: '0 0 54 32', fill: 'none' },
      h('path', { d: 'M0 0H54L0 32Z', fill: WHITE }),
    ),
  )

  const topGroup = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        flex: '1 0 0',
        minHeight: 0,
        width: '100%',
      },
    },
    bubble,
    tail,
  )

  // Render EITHER the avatar OR the initials fallback — never stacked.
  // Stacking via position:absolute is unreliable in Satori on the edge runtime.
  const avatarSlot = h(
    'div',
    {
      style: {
        display: 'flex',
        width: 152,
        height: 152,
        borderRadius: 4,
        overflow: 'hidden',
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(255, 255, 255, 0.18)',
        color: WHITE,
        fontSize: 56,
        fontWeight: 700,
      },
    },
    avatarUrl
      ? h('img', {
          src: avatarUrl,
          width: 152,
          height: 152,
          style: { width: '100%', height: '100%', objectFit: 'cover' },
        })
      : h('span', null, initials),
  )

  const identity = h(
    'div',
    {
      style: {
        display: 'flex',
        flex: '1 0 0',
        minWidth: 0,
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 16,
      },
    },
    h(
      'span',
      {
        style: {
          fontSize: 80,
          fontWeight: 500,
          color: WHITE,
          lineHeight: 1,
          wordBreak: 'break-word',
        },
      },
      displayName,
    ),
    h(
      'span',
      { style: { fontSize: 32, fontWeight: 500, color: WHITE, lineHeight: 1.2 } },
      'Participating in the Incentives Program',
    ),
  )

  const wrappedPanel = h(
    'div',
    { style: { display: 'flex', alignItems: 'center', gap: 36, width: '100%' } },
    avatarSlot,
    identity,
    ensMarkWhite(134, 152),
  )

  return h(
    'div',
    {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 40,
        background: ENS_BLUE,
        padding: 48,
        fontFamily: satoshiLoaded ? 'Satoshi, Inter, sans-serif' : 'Inter, sans-serif',
      },
    },
    topGroup,
    wrappedPanel,
  )
}

interface GenericCardProps {
  logoDataUrl: string | null
  satoshiLoaded: boolean
}

// The site-wide generic card (Figma node 5993:5627): "built by blockful",
// the program headline, and a CTA pill. No per-user data.
function renderGenericCard({ logoDataUrl, satoshiLoaded }: GenericCardProps): ReactElement {
  const builtBy = h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        opacity: 0.7,
      },
    },
    h(
      'span',
      {
        style: {
          fontSize: 24,
          fontWeight: 700,
          color: WHITE,
          letterSpacing: 0.96,
          textTransform: 'uppercase',
        },
      },
      'Built by',
    ),
    logoDataUrl
      ? h('img', {
          src: logoDataUrl,
          width: 150,
          height: 28,
          style: { width: 150, height: 28, objectFit: 'contain' },
        })
      : h('span', { style: { fontSize: 24, fontWeight: 700, color: WHITE } }, 'blockful'),
  )

  const heading = h(
    'span',
    {
      style: {
        fontSize: 80,
        fontWeight: 700,
        color: WHITE,
        lineHeight: 1.2,
        textAlign: 'center',
        wordBreak: 'break-word',
      },
    },
    'Earn ENS rewards. Strengthen governance.',
  )

  const topGroup = h(
    'div',
    {
      style: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 40,
        width: '100%',
      },
    },
    builtBy,
    heading,
  )

  const statPill = h(
    'div',
    {
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        width: '100%',
        height: 99,
        padding: 32,
        background: WHITE,
        borderRadius: 100,
      },
    },
    h(
      'span',
      { style: { fontSize: 34, fontWeight: 700, color: ENS_BLUE, lineHeight: 1.1 } },
      'Delegate for free and earn rewards',
    ),
    rightArrow(32, ENS_BLUE),
  )

  return h(
    'div',
    {
      style: {
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        background: ENS_BLUE,
        padding: 60,
        fontFamily: satoshiLoaded ? 'Satoshi, Inter, sans-serif' : 'Inter, sans-serif',
      },
    },
    topGroup,
    statPill,
  )
}

type FontEntry = {
  name: string
  data: ArrayBuffer
  style: 'normal' | 'italic'
  weight: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900
}

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const { searchParams } = url
  const variant = searchParams.get('variant')
  const debug = searchParams.get('debug') === '1'

  // Fonts are shared by every variant; load once.
  const [satoshiBold, satoshiMedium] = await Promise.all([getSatoshi(700), getSatoshi(500)])
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

  // ── Generic, site-wide card (no per-user data) ──
  if (variant === 'generic') {
    const logoDataUrl = await fetchImageDataUrl(`${url.origin}/blockful-white.png`)
    if (debug) {
      return new Response(
        JSON.stringify(
          {
            variant: 'generic',
            logo: logoDataUrl ? `${logoDataUrl.length} chars` : 'missing',
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
    return new ImageResponse(
      renderGenericCard({ logoDataUrl, satoshiLoaded: fonts.length > 0 }),
      responseOptions,
    )
  }

  // ── Personal card (delegate / holder) ──
  const rawName = searchParams.get('name')?.trim()
  const rawAddress = searchParams.get('address')?.trim()

  const name = rawName && !isAddress(rawName) ? rawName : null
  const address = rawAddress && isAddress(rawAddress)
    ? rawAddress
    : (rawName && isAddress(rawName) ? rawName : null)

  // Unknown variants fall back to the delegate card so a stale link never 500s.
  const copy = VARIANT_COPY[variant as 'delegate'] ?? VARIANT_COPY.delegate

  const displayName = name ?? (address ? truncateAddress(address) : 'ENS Delegate')
  const initials = name
    ? initialsForName(name)
    : address
      ? initialsForAddress(address)
      : 'EN'

  const avatarResult = name
    ? await fetchAvatarDataUrl(name)
    : ({ dataUrl: null, diagnostic: 'no name' } as AvatarFetchResult)
  const avatarUrl = avatarResult.dataUrl

  // Debug mode — return diagnostic JSON instead of the image
  if (debug) {
    return new Response(
      JSON.stringify(
        {
          variant: variant ?? 'delegate',
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

  return new ImageResponse(
    renderWrappedCard({
      heading: copy.heading,
      cta: copy.cta,
      displayName,
      initials,
      avatarUrl,
      satoshiLoaded: fonts.length > 0,
    }),
    responseOptions,
  )
}
