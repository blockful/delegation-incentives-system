import { ImageResponse } from '@vercel/og'
import { createElement as h, type ReactElement } from 'react'

export const config = {
  runtime: 'edge',
}

// The personal cards (delegate/holder) use ENS's deep brand blue as a solid
// fill — NOT the lighter #3889ff the app DS uses for buttons.
const ENS_BLUE = '#0082bb'
const WHITE = '#ffffff'
// Hairline border on the generic card's stat pill (mirrors the DS `border`).
const BORDER = '#e8e8e8'

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
  satoshiLoaded: boolean
}

function renderGenericCard({ satoshiLoaded }: GenericCardProps): ReactElement {
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
    h('img', {
      src: BLOCKFUL_LOGO_DATA_URL,
      width: 150,
      height: 28,
      style: { width: 150, height: 28, objectFit: 'contain' },
    }),
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
        border: `1px solid ${BORDER}`,
        boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.06)',
      },
    },
    h(
      'span',
      { style: { fontSize: 34, fontWeight: 700, color: ENS_BLUE, lineHeight: 1.1 } },
      'Delegate for free and earn rewards',
    ),
    rightArrow(32, ENS_BLUE),
  )

  // Decorative ENS-mark strip along the bottom. The PNG's own background is the
  // exact ENS_BLUE, so it blends seamlessly into the solid field above it.
  const watermark = h('img', {
    src: ENS_WATERMARK_DATA_URL,
    width: WM_W,
    height: WM_H,
    style: { position: 'absolute', left: 0, bottom: 0, width: '100%', height: 223, objectFit: 'cover' },
  })

  // Content sits in its own relatively-positioned, padded layer above the
  // absolutely-positioned watermark (avoids padding insetting the strip).
  const content = h(
    'div',
    {
      style: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 48,
        width: '100%',
        height: '100%',
        padding: 60,
      },
    },
    topGroup,
    statPill,
  )

  return h(
    'div',
    {
      style: {
        position: 'relative',
        overflow: 'hidden',
        height: '100%',
        width: '100%',
        display: 'flex',
        background: ENS_BLUE,
        border: `1px solid ${WHITE}`,
        fontFamily: satoshiLoaded ? 'Satoshi, Inter, sans-serif' : 'Inter, sans-serif',
      },
    },
    watermark,
    content,
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
    if (debug) {
      return new Response(
        JSON.stringify(
          {
            variant: 'generic',
            assets: 'inlined (blockful logo + ENS watermark)',
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
      renderGenericCard({ satoshiLoaded: fonts.length > 0 }),
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

const WM_W = 1120
const WM_H = 208
const BLOCKFUL_LOGO_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAcIAAABUCAYAAAARUDevAAAACXBIWXMAACE4AAAhOAFFljFgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAFp9JREFUeAHtnUtMnde1x3fwQ3FAxjiGU+GQckhClBR060g15DaDBKK2V/fad3jDHdxJ8B0WMjUZVJXsVGoHIR0Wd2g7gw6Cbal1i7HUF7hSXBVsyw84fgTEwwEfC0zqtE33f7ufdULO41v78X37+876SSiK/Dr7O/tb/73W2mutJ8QPf/2FiJmOxjrR/cxO9d9M7XZRu32LWH/4d7G4/lDM3tsQ526uiumlNcEwDMMwtnkiTiGE8PV1ZERnU13F3wtRHDo3I5YePBQMwzAMY4tYhLB22xbR/0qz6G3dLaj8JrciTk4vsiAyDMMwVohUCCGAB9v3yJ9GFf404fj0gjh5aVEwDMMwjAmRCSHCoIP7W0RT3XZhC4RLT0hBRA6RYRiGYXRwLoTZ+h0qDBomD6jL7OqGOPq7mxwuZRiGYcg4E0KEQXERBmHQqOD8IcMwDENlq3BA3zcyVvKAVN7M7lae5xgEkfOHDMMwTAiseoQu8oC6cP6QYZg00ITaahlhC/4LgqhXTqaF1j//u2DMsCKETU9tFwNdLU7zgLpMfJIXIxfnUxsuxbPvIDz3yfm8albgOz2E0hoYg1x+QzDpoWNPHelAnZR9HQaIXdfeemlPa0W3/G+lyBoO/XgHJubyVXXwt2n7jEKjceQBqXQ/U69+0po/7GisFYPyEBKW/jNriTAYlDXB82chTBdvtjWInmz4w1BS9nU5dMvL0I0LP7BzfR1fq5rUEDxkip0YGv+rmFpaL/pr2kJ44IU94n/lQzfNA04trYXyJHHiyTbsELoE+cPRa8vi1LW7gmEYxhfg3Rx94znjtBIEcXmdLwtSIQsh8oD9+5pFm4EogQX5ZX0oT/Jj0pUf/Z9/q/j7j/zhpuh8ula8JcU3o7lZsEkO7durTlycP2QYxgcggsPfbbd2uXBqmfsyUwkthLbygGsyfHFKemWj15dlKOMfpD87dmtV/bz1jYxqz2YiiINdz6r4MpdbMAwTF4EnaEsEkQJaWv9cMDQqCqHNtmgqT3dpwfiLQvz73M0VFQ/X6VcagHApfrj+kGGYOOjrzFi9ZQ/7ytApK4Q284AnZShyanld2AJiOjx5R4U4h76dtZI/5HApwzBRAW/Q5CC/manFNfYGNSkqhJTxSOVAGPTYxTmVB3QFvviBs9dE79cbjPOHCJfCyxyRn3ly7r5gGIZxBbxBmyBKxujxJSG0VQ5hkgfUpTB/CC9WFwji0GtZFS499uf51NQmMQzjF5177NVd4/LhGEeztHkshBDBIzJpa3obFGHQ4Qu3Y3PRbeYP23btEEPnZ1gMGYaxCoYRUHODcDBg21BKBmCzUTuIS3+Tc3nB6PNYCL/f1WIkgi7ygLoU5g+PvP68drgUz+Pwv7cqMWQYhrFFU+02QWXw7NWvOBij1+9q/V3Ml1FC2CPza6/urRc64JSCm0qjHhapY9McOnPFKH/YmakTB9r3cBE+wzDWQFcUCuXKIviCjDlKCHVzavC4oswD6oLc4cT8fSVoOmtFmBW3STlEyjCMDeqIN/HH+SKMU2rgDVJj1QiD9p++LE7IfJzvIhiADu3IH+JzjxE3VZ2Mxfe2NgiGYRgbZIge4ey9zwTjjq2vtoQPic7IJO3PL855kQfUJcgfjs2uiIH9z4YOl3Y113sZ/mUYJv1wNMotW1HUWQmf84C6TEsxp+QPs7vNbtMyDMMwflITpiPLBxdup9YbQv4Q5R6VqNtmpxcgwzAM4xc1YX7TbD7d8Wm+dcUwDFO9GA3mZdILrndnd+1QRbsBaEqOXEXuHg/BLQTPCs8p+G9A8LyW1h+qy1pJAWtAf2GspzB1gjWoH94DTMpgIWQegx6zvdkG0b23vmyjdRhC3ByemMtXZZNyPKfOplrV0QPdh8I0pZ9d3RCzUjym5XNDH1ufhBHCh0NP9zM7RXdzfehb5GjynMtvyH1wX60ryaDTC9avA26hb44q9VToatVIvDXaE6JLFgbylppFiANNB6F39OR83soFnWB6UVhgV6ZjuIzJQsiohgqorwxrAGH40doJP6ixHMutiHO51VSPscIL3dPaoNas04weXYrwg9Z9wIfRX6Yj1tBsAj/484vSCCd1egtE8GiP3kzA49PFx8oNdrUIm4T5+3AwmTpfQgjVUIHwn2lo/K9SlMwF6VH/akLttnyeLIRMpNgYtox6KIhorzTwaR1jZWscWSFxzsK0OWM0oHB6S5L2gRqMayCCqE1mkg8LYZUSTMa2NRQ0MIQIv6RlaoeNg0IlAkGMyqjC+xl6rdXqMNhCgn2A8PrIxXmvowQm0+FZBNMFC2EVYlsECwmGHA+dm0l0qNSFF1gO/FudMvc4fOGOs+cW5ZoQQkZplq/7wOQdUF48i2CqCFU+waSHuq1bnIlgALyCI5rhJh/ATMtDr+yN/PMj34bnFqbJBZU41hTsAxfrMcFUBD+QhxUmXbAQVhlv72t2KoIBMIIYYZU0TAc7m+JCPOJck29iyCLIFIOFsMpwme/6yr/1rxFWSSFuEQyw6VF3Ne+MfU1Yz8B+u7codWARZErBQsg45dC+vSK760nhOz4IRiFKPL5lJh4w/Hj+PhD3oQg3ZQ9rXhJiEUw/fFmGcU7/N/eKofMzwldsCcbS2sPH3VdgeFE0XWfg1eHCiclQ6L7OjFEYHM32b97bUDWC8E7Rb7d11w7tNcU11xPfxRHpCbY10BvnY+KOjgiitrYclZpWUP8+kOY6XtewEDIKdHRA26zc6iPDF4DOKR3yNI8XVxd4Ax1NtWJ6yc/xXSaCMfFJXgrVspjNbxSdzdlUu0107qkLNeGk6GfTFA80SegN0Y1kMxA/rAedYkqNW4OHf/DFRvLfDyHFzdWob1yaiOC7528IHYYriGfmDVqnl2H2SJ3CQljlQABPTi+UNHro8jB6/a4y6GjzpBs+7Hv5a2JoyT+vEN6gjmDguWFqSaWG7fj1sfVVNeVEJwcJ8cCfO3ZxnvTndL6nBXkAenf8RsU15e59pmZ6onD+yOvPkwQeAnpK7qeovMLvy9ykiQgmZfA4Y0asOUL0bBz5z5dC/d4jrz+nWlwx9kBR8ND4TKhByzCOOMn3n74sFtfoIZjAK/QNeINUPrq6rJ4bdWoJnt/Ar66SReC/iR1g4A1SPVwY/nfOXiWtCb93SIoFZT8EXmEUQASDlnYUWASrj1iEEN0tEK5Aa6OwL2zQsQKC6FtdUhLR7YyhY/wCcPDxCR1vECKIzjm6wJs6PE4Pt1HE48022prgCb73+5yW4cd+CDPPEyDsOirDrpciaNDdv6+ZRZAJTaRCiKQ1Nujw99q1r/HDsxg58JI67bEg6mHaGQPG76g0nFS6DPKMLjj4Is0zgWCcvLwgTIEY4iBCASHFMFCnDIAPSzSODosKn0uBKwXCyCMfz4lDZy6rtmtTjpsqI5SMPqpUWASrl8hyhLbbOwWtvPAC6t6qq0aUMb9kz5hTclHPNTwaWeRLH9LORrpg2DKS2LOUkCdCimEuHHU00sLPmFgwZqFB9onpReVdB+uB93fu5oqY/CTvXPgK0a0FNfGKmeTjXAgRDhuE9+agmwnCpbj2jtNfWicf2Oa0PDiYnP4LoRpz0CkNNebXxQ08pyzhEgUM5ZjF/YUSi4/kd0Ex2l3N9RWF8NUWmtcNsbIB1oO5fJhrCPEbu7USuaiYiGCYS0JMenEmhFF07g9IUsf7uMEwXVsExo8ShoKh9EEIqUX+p8uE/nTBQYJiuFHKUgnk38Oypr4/e+J+4tJCbB7VWy9ntHKCeAYsgoz1HKEaxChPZsjjRdnOC6AAmfOHpUEYzPYLjzo6Co2efC/INVOYXrZ/wQMHCdRthiW7u7zI4d2jRF6mF+2uKc6woo4IAoScm2rZVlQ7VoUQecCR/3qJNpHYAXgp0KuRyy2+jAtjjlwhhYwnRieMdxUAr2F2lbbOsKCJQVjqKghddhetXs7FfkgiA/ufTeykFMYOVoQQecD3v9Mey+iaUgTh0p9JYe7au1MwNKMbFng1y+vhQ9FRTL4IA7ynsOiUioRlZpX2nWSe2lby15rK/FoxXOyHJAJbgfwiU70Y5QijzAPqgk0+9Fr2UcnA9GJV5w8hWi6YlQa1MWHhJUq/zAcOb7lSb9A+CuMVvzBDPYS62g9JBJe+JmX+3Nc2gIxbtDzCIA84/N12r0WwEIRLkT9U8/iqNH+4+MDNhQCKMfclNEoR7sV1d4cnm2JEbYa99jmXChTCIVL7JCX/SvYIbdcDRg1OfrhdyuUWjA+ssxh5QxAipfZ1ZZJPaI8QeUC0RfMpD6hLYf6wIyEeLWMXX4r6a7fxSFCfwEHZx564SYWat46LUG8hBoSiL2hSwqBhgSBiYvXbrzSLaiDjaFM2eRJmpPCAEJKsc3jwo1zaAeUEfM0TcfcJnYtOmJ/J2CHjyeW4SoQSwrQJ4GZe9awHpitcxespxtwXY035HC4vAlENRbmcItXLbaunNRVIGiMX51SDePJzadjBt0gtkZToIcdlqojWevpctjBQWpU98EQIKbeHXZ5qqbPyZsvUbVJrOtNcSI4+uKPX7qoGEiem6b11cQ+impty2Nobbbvc2BzbsBBWES42JXW0ki+hUcrnCBpeu4DaEq2cd0MtDULv0jSyecQYBkvnVuk1kwP7WwRjRpaFkPENtBWzHarobaN177mZ96OIe4rYXszFLEV4HJQGA7mV8s+O2twALdts7gdqvtMFpUaM/UyGSangfTnQHs0QYd+w4Q3j7+DQKOMlNqeDY6N3E70KX7qZTBNHA4WdB0ihr5OWhwrTEm2KMPRWebqN9jzd/lea1U1stDaMI6yILj0fXLhT9NcqzUwsRV+Vhkht9AS2ubdcU7PsSajKd9ZS0oUDBt3WKa0n20D+u2bvuenZSQXe0zRRNGz2roVx7dxjv/E3tWXbwRfsCDzWg3mEQWkSmlcc/nZrZMOY1Sil8zfK/h7MTKTeIsX3noYQKfXCUHeL+ff2ZpteI/Q4qJnlfoOhqBSWSgrqxf6W+YsNw0ed/YZwpC/1e+CPxMkZfRYbSeAQQQmLwtBPhWj/RW0SgfCfjfxnMe8W02CGXmtVXiI6Ubn0rH4UYqguDj/DF24LKmkIkVI7GJnmxfFdJ6lGu+Yvi9yBPgy2Bpj6AAyUyfVwbHLUX1Lx7RlCNKjt4WwcIrqad5IPER+GvPlI9XQBWouZiBTyp/AGS4HnhkNE4CV2Osi3hm0XV60hUlykoh5C+17WnyJEDftHQbkcdg3VGFQj6jSespE1MMQ6YohbjhBBnSkSrp6hbj4jGCxMAYcIk1AZRAOhQwrU/XecWC4AoTosPTcdbxfiMEh4Hnh+TbXxdhtBiJRq89IQIl0ipsHgCetM7sE9hHIHo7goVxJSA2OgU2dTTZzLraRygjXEMGybuaDROjoM6YggBvi6eobIZ+ie1uEdUI1ib3a3em6Uf7Pw+VEFh7r/4PVQvULUM2KUGmVNEHWdQ1Hch0rYvJGP9W6RJnmkm85zH5CHNsqakUdHG04fOdBe+n6EarqNOpsO+SV3V0mHFQq4hVfsOnZaCNrMza5uqMsYyEMF+QQ18fypbeoUjxpEk/zYqeu0cBTEKey/h9P6+99rV2IbjNFBD090RDp5eaHsUF0IzEdSDKmhSjw3hPpwXX9y7r4SnmJ5GJxCe6VxONiud0kJ3iD12QF4hUd7nif9mcI1nbp2t+QNXxUKbWvQOvX/xpND5ditVbmG3eQ8FoTh0OkriYyi4f3APqSAdysYY1dpT/R1ZCLtQkb9DrC/cdgbvbr8uNl9W8OTqtbx8fSJ4ck7IvPGdlKXkLSDG3hHZRK+GoBHgB/qixIGXJKZIs55Qy9QinDghcWoLfwUEkZE8IKrG48anm7hv7m09vBxoT4+O14808s1yA1WugRSjMAr1LmwEKwJhgYHpEDgIeoma4Kon7zkT/Tp/Qu3xfB3XiTvs7e/2VyyTMNn0HmIcsAsxNWeMEFnhBk+azGPtabwLx04e00rkZxGPpKnhndVn0Iek2PK8J/oN/WivM2MvX9U3To0O+UjRIjwGX5wqDA1DtiDYwajwmDoTdaEz4+1ICKgogKGazotbYtPKQbd9msQhCROqNDJiW/G9p4wweaQ9a8U1I9cnBcDv7qq1bU9DcALHDp3Qxz78zyLoAUQotMxflG3YsNp2adcOfYh9qAJeO5HfudHRAMpBvT+9A2khaj5VJDUIb5pc3R0WucVo2hnGRiFQ2euiOGJ21UjiJhGgG7170iveIrYdSRJTC1Fd1EBxlw3vzpBrPGzAYzicQ/EECHE9yyF5BEijXtNWI9O/V5U6LRfC4b4Jg0cjqIUQ9fTZmxdvCrbYg0JZYwx8cE4uAQhqENnLnt5YrXNiPQyojjcmBpzGPA4LiRAuOPc7zg8vDt+w2oIMc41qY4vltdjGxz8dZ5PUof46nTY0eWYxiGDgq0Dc8Veo9jAeJH6T182ji/7BrwjrKuawqC28mHlsGX84gpVYr8jGhK1EONmHvLSLkQDa9IpGTAhCSIYgAtTOuKQxBApbIDOnEYqOFxQL8lR0SkVKkboptvYzLhZevS3ucSHS/GCIg84ND6TyvrASuAEfHjczYuAw4Ut46ebv7EBoiEDZ6PJlQdhedxEdHkgw/PEwS+KNWEfvCOfX1LeL932a0kOkbrc35tHYbkEl8JM10GePjExfz+x+UMYHHgZ/3/6SqrzgGGAGNp8EYJna/twYWOT64J1uN7r8AIH5fcQVVg+WNNxVZZh/yCEfTA8eVvtg6RFWXTbryU1RIq9AM/Q5mET3z+cpShrr7EORLlM3tEt4o3/+4HQIJf/TEzO51VYIAlTiJEHfO8POfHxQrpapaEYFNeYwwKvIDCAKCo9Jf//C/GoVVadZogHxvwnE7dUYblt8BnRBnD7lifEi0/TjQ36m5oKM/Y6nhPqBPG86wxDYTAWv5z5VPz4j7ce9Tv9PHrBgNH/7Z1V9f7Wbt1ivCbUlv3iypIqlbn6qflNPjT3oNQ0F+5rE65++kD8x3NPy/1G8xGwL/CdhgXdiShT4E84EhbsPZTomO5t7Gl8/7ADuYIJM2jKQRlhBlGe1nBS7n32N6VH8NCf2fmkoPKE+OGvvxCGoHcgmtL62F8OIRqEnXKejP+xTXbXk6SOQOUMRu/XG0RXS73qElHuhcCmR4eJSZmoHru1EtnJP9hnmKxe7vPhSjVuk+HzufD88czROBoHkNaQxgOGBp8JL/qEfGF985a6m3eq776tfkcoAQr2gDJc8sf2c0Zj8rYYhBBgjp5Oh5SJuXxoO9Mj3zVKA4cTEXlYWDs67oTZB2HsgBJCwuSOKU0hLCSwY+Xs4ub9a0UICz/AW9JQ6XTosA3ygD+VIZpqD4HqAmOPTZwpOLWitg9FrD7kffD5MgUTsGEEFx88/FeX/WhFBgKtPGr5vAovTsT5mUwJvv/Na/JpDzBuqd1eo5rsg0I7oLrL5DcSsQcg7IV7uNRntyqEAQdf2KManMYhiFD6UzLOP3p9mQviGYZhmIpsFQ5AmALhn6jDpcgDoskyCyDDMAwTFiceYSEIGw3uf9bptGI1IQI1KxwGZRiGYYg4F8IAF/lD5AF//vGcKulgGIZhGB0iE8IAFJ/qjrwJ4DwgwzAMY4vIhRCYlFugZg0zzfjWGsMwDGODWIQwgJI/5DwgwzAM44JYhTAAtR4oTkaRcmPtow4nCH8urz90WhjNMAzDMP8ExhYAO7SrLUYAAAAASUVORK5CYII="
const ENS_WATERMARK_DATA_URL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAABGAAAADQCAYAAABIixfPAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAOdEVYdFNvZnR3YXJlAEZpZ21hnrGWYwAAZDZJREFUeAHtvWd3JNl55/lEpE94j/Kmu8t1sdmO7GazKXojkSuJkkaiZvfsnn2z32Jf7XeYObt7djXLPTsjSjoz4khDGXrbbLav7qruquryVUDBA5lA+szY+9y4N+JGIAEkgLTA/1cViMhIFxlxI+I+//sYyxFY/9uPCAAAAAAAAAAAAAA0H+d//QrZBAAAAAAAAAAAAABaStMFGGufzwMAAAAAAAAAAKC3sELzes9bdLg1gaYJMHJHWpa3vNNrvfcQAAAAAAAAAAAAehHTrue5s8XrzPWsHRxGLSBKTSAspDg7vd7b2Y58pzxIjrPj+wAAAAAAAAAAANBZPAcMYceTMZc2veNs+z7z9fy45hweJWBfAoze6ab4UqPtBRgpuYgd7HrLWEqC8b1nahBiAAAAAAAAAACAroTDaLT97mg9QD/eQUxhvSCiRRty9YGIWD4sOsCeBBjeVbYVdBjSIlYjO82R72exxXBVsvRnHz4VDAAAAAAAAAAA6GZk/hIluGj7PWy2N2LFV8UUDb1f6gvif7V2sHWAXQswLJzwznGcUP4Wp3HRhF9VEzvWtq1NMWK2+lBbPFMVz0CHAQAAAAAAAAAAOofUAUwFwPHXa3YjnjgqKsZ7v3pr1DrYOkDDSXh5v0RtV3xxPWDIS/4ivV9ody5DNfnX8UKQKDy3XFekmI00vQAAAAAAAAAAQLthwYBt8ojyUNH2v7esFneb07VqvNjy/rifHTGFmQNGQx4wegeEvVW8feK44US7pSZUmIhdX4DR38VzPuBVB2FJAAAAAAAAAABAO4jawXyv4WWd+8URYsDe9ABH6AHWJvtffjd/rnhQcXbOK9NL2Ds9yTs9Yux4Q+zyHleIaC+7RCbsdfzPMefhdRwjJhsAHGIAAAAAAAAAAICWoJ0gbKpv/5uP2aDfjx4Q/t7wPKZ0gIPClh4w7JkSUf5FnrJFQWVKii81Z1+KVNVh1WuzDhT+Lpm4V38nKiUBAAAAAAAAAABNRYYcRVz7vJ79H7bD+bFTq9FeYT0hLr6vnv2vifA6sUnlA5Cgd5MAo9UuL7sx+T+eD0ONgm4ztX1KIfzucrXmHWQv/isUE+bl5hHblYhYUrg5CAcAAAAAAAAAAADoNDrXy3b2f9gXpbgP8YXh76qKzzCdMgL2v1qWaVEibrnqXtYBAgIM6y5xlV03kOvF+PW2US6KRZBmhGPpjwgn3zE3wlHrLMevFU4HRAUDAAAAAAAAAAA6gU49YinDfyv73wqpIs3SAzjPC/vAmFWWwva/Ln0dUY4iZac3KyVJAcatcGTJqV5VIo1j+ev5dZUmiR/uZ9Wk65F+LL/H+D5Pj7GCiXm4QZRqKFcNAAAAAAAAAADsBumEEXEt7u3sf7fyMfkrnObpAUyl6lA8agVyzITtf72Oc9TaDoswuyt93Q1IxSMetSlm23KXu3lWLM/NKJxwRz9f2qerUZiqE/SEcQ+yJcte+99tGdugfoB4PonkvAAAAAAAAAAAQMMIGYCSEZvcfy5b2f+uRuALJNUmO0GwulCt1na0//X325ZNCduWYVO9pAXI/RyVbjwyfY7313X5sZTfT/AXlYX40gqPk1LFFXX4e+V3Ow6ZX8Rb5T2nfwA/Fjs+yQISRBgAAAAAAAAAAGBbYhFOP2I3ZP/LZw1lxnHcEKBmwx4ttQbsf3cb3e3hKJ5e0gL8HDBqi8P1iLyQJP2Laq1LesPyC4cixSIRb5vC4VCm54vePvmYd7xQwcpVR1ZJAgAAAAAAAAAAQJCYUAHiVsSrNGwStv8D4UDk2uG5apVaBTtlJGORHe1/r1KyEmPSdkRG6bAe0M3I/a1FJNuq59qjXqieyzc59CiMcoLZ5Pqkt0Fj5odRRZtkLFgy5rohAQAAAAAAAAAAwCcRtSghxIpG7X/TFm9F6FEYlgPKSuDZyf63Qw47iYitigp1L77g5ZAnd7mKl/8i/YNaFXpkwh9fqFRpC+8nb53OwiyVr9A2JaIQYQAAAAAAAAAAAA0nuY3pcs8N2P+WZTzvuCFBxRY7ZDDlmgy88bZhJ/tfv46JCREmGbGpW3E9YPSfreJ9GPErS21y56nJbMb+47rqnNFQTDVMz1mEiSApDAAAAAAAAACAQ048SjJpLdOI/R9YpWzucpXaVn24xE4ZxjbsZP+br4tFLEpGu1OEkVulE+5Y9eZq2qi0N5aqWFFuRxTUgRgzLs3cXv1Yz9MxVEcCAAAAAAAAAHB4SUjxxc2zqnOn7GT/69daRl7Wchu8XzSsBpSUG0yj9j8Zr5PJebvQE8bzgPF+hOMED4KYSlUOPWqvACNjv2oU2slukh1bbxtvK096+8OPLZv6YlECAAAAAAAAAAAOG2w7uzlfrE35Xray/zcJMWJhvdy6xLtbwQl5Zc4XatT+t7zXsW4Qj3SfCCO3xjZ2sh3a4Sy7lDqUSZjdjnQZKksFoAVUOEPtCjymYLKgRBfHgAEAAAAAAAAAAK2gPx7xyzgr23k7+1+/zkzIWmlx4t2t4K/Mlaq7sv9Jr1dzmR820j1hMV4VJD23jMdMXihdnSrk5CXkJcPtiFQSHqJNDYV/jO23Ey9vDO90C7FIAAAAAAAAAAAOCVyYRosVbBvr9B7b2f+mjW0ruztf6ZQioEKRqs6u7P/wlI5GZMXkbiDoGmLsV948jvGq1DpbR5vLUleqjr8zlRoTLoulRRqdzVm/TrssJVAVCQAAAAAAAADAISHFjgj6ga4qZL4gZP+bgox+XbHS/nQkYQoyP6zTsP2vxSPTgSMdi3SFU4YnwKgIH6WQWR1XukzylaoseUWWmQjI8r2i1HZL9yn9mMjb+7wu0aVZkAEAAAAAAAAAgGbCUTe24bVgWUEPhrD97yWxNebsi1Gqti/x7lbIUKRydVf2v16pf3ZU/El2QSiSzFBrK8HFU5GIRY/OK10aPuSFCrsOqcbgPeM/dox19aQW3QBrte74TQAAAAAAAAAAQCuIRWyyKSw4BO1n0452tQtXF9D6QLbU/sS7W8GRMVwViUtpN2L/m79Hk4pGqCw0jkq1c5qAVwjcMtSiYrXaFUqXiZuQt+YrWyYhVylHrzNFPotVr84rXgAAAAAAAAAAQCuJG94eYfs4bP+TWufNLDfsp1scMjSckDcYGbO9/U/6NcbvHoh2NhQpWIZaTFWhKnVL6JEJb9EGl74yd7bhbmQmEgok3zFe00XJjwEAAAAAAAAAgJZghueY6VBNkcIKr1MrHaEJlKrdqQnkKk7D9j/VEWQ4KibZwfywngCj54UuCj0KIxPy1lzPHMtQ6ExVy6yWFAbVqAEAAAAAAAAAHHSituWLE8pWtg0bWs+9SkLGupwwvKtdqgkUK1VZLKgR+z/8u/S+SHUwIW8gBIlDj4pdFnoUZr3ol8X2vGAc/7EdUMIsr1G5BwgKDAAAAAAAAACAw4VZJUjb/zp0x6yQxFWQe0ETqAmBaCf7X6szpscM60q2zflgOijAyOQ0DmcW7v4EtdwUiuVQg/CUPMtwNfJbmM7sTFZ3NyQAAAAAAAAAAGC/hMOMzJWq7pESLKxAZaH1Lkq8uxVs1efLTgP2v3qDoRdowSbVoVwwXggS51fpVjejMDlOyCuUOVv5tOi53n1u1mb3t+iDIg+Hs9kDJh3tjnrgAAAAAAAAAADAbogJRSFWJ6eJo3wPXI8Qy5vrda57iGNoFFZPaQJ5oQlUaq5YtJX9ryfv91v6Fe5yJ8pSS0WCg3o490uv4JXEsvwm4xiZdixD1fM8j8RCpY4rVToWESIMQpMAAAAAAAAAAPQWg/EIJYVNG6YsFRhXgtDShFli2rZ8/xh2SGAHh3y5+71fTNYKHIq0tf1v/n75Gz1tyV2f6IAOIL9xNV+hXqMs9l65WvWTChmxXW6DIk/ystW6SkjNk94z4k+iQ/FfAAAAAAAAAADAXmDZJRKxqZ45y/4V2k62jUnnf2FsY5m9X3rD98WHJSZZLpvq2/+B302b90dC7LtYm71gXA+YHnEzCsOKF2+6ZZnhR35DMrMec5KeSi34O2NC8eLXx8WORxgSAAAAAAAAAIBeIRGLePZsmHK15jkoEIWcFiiYmJZLThe6PPHuVsiwKVUVKVz1yDTx/XAkf18wiTaXSu7p2BtuIhsV303K28FKZ/HEGYsb4GaRScZ8qfek4QUDAAAAAAAAAKBHSEbdOTsTxEOeHKWaQ46RokNjRo3InLXiQbbUexExJpmiqwmY9n898cWLSjLgZLztpOeTn2yUOCGvZSh7lufNYhnZjtfrxLPFo7b3fNRGHhgAAAAAAAAAAL1BLBL1yiwn6ggJeVnRKOSIoPOlKEViXYgv1VpvRsRoOD1JTtj7pv3vzs2wKytQDYnUc+wAE7Hb54xxIFSH1WLJq/lNISGG/7FLVbhRxWWsnOUdiHa7HgEAAAAAAAAAAHuBbVnbEFPqFZZhZwXLslTCXdqUdoPz9G70WOLdrVgvKscMLa7wH8sXYsjLGWt5IhQpDaGd1ZAOhOogY9bKVSW4GLFtygUpWypveg+HHMnXO+7rohELeWAAAAAAAAAAAHQ9sYjt5zlxXC+OcBgSp+zIqfAi7bBgK8GGH2eLFerRdLCb4N/KjhmeSa9tfTLsfsP+1/uNn4/Z7QtDOjBuH2ui8WjvKq/ZWdzgqlKgMeHd2xeP+mKNEmzgBAMAAAAAAAAAoNuJm5qBsmcHErFNr8sWq57IYiamZTs516OJd7eC7f4NITj5IkwoCTHRpgrKPMWj8IDZNayxcPIgs+QU78ZsHZeqgUTET8Kj4OV4m0tQAQAAAAAAAAAAuyWuPWDIt2tTQkhIhEKRWGJhT5dw5aPsAQk9CpNVCXm96shqfT37X6d+ibcxGuZA+XxkhYrH9c4jyp1orVjelPuFhcL+eNRLRaTLVfERiBAEGAAAAAAAAAAA3Y1t2X7pZS00OK6tG4YL0pS0t4vD+VJ6P/HuVvCvzBQqAc8XFj3q2f9uCJJLrE3KyIELulnNc74Xi3LlGq2XNrtUDaZiniuSVrn0wYihEhIAAAAAAAAAgC6H02cYKWY9F496XjDMirCT2TquOg5lSgfT+0XDglOh4moB0tbfwv7XlaB4FmtTPpIDpzgUhLK3mCvTanFz4l3p/RIzXbUcmYTIJj9bMgAAAAAAAAAA0M1EjZAZ17Z1/7GBP5zY7AVTEarD/HqRlnJlOgyw4KSt/O3sf3O/tYMD6fKRr1SpnkfVeH+C/F3Mu98KBIPZNkQYAAAAAAAAAADdjycwWJYfhiT+JiI2DcQ3V/ZhEaZ0QEOPwvBvXSu40TFb2f+6ijLvkShywDSXvmhENETLczMiM1aO3OX2FZ8CAAAAAAAAAAD2iBWs6CNXGXbucDLatsSy3cp6qUq1mrOl/S+XLfLKcreDQyHAcAjcSDLqiV22nluWWzGJCAFIAAAAAAAAAAB6AtsywmvEshYQ9PqImI8lo3SY4SwwS/nytva/Xt8uDoUAM5SMUTTq537RKZEdx3F3tmqkB6sKOgAAAAAAAACAwwILMWzjanWhPxGtm5D3MME5YnOqAlTY/me0l5DVpnCYA380uL0NqlJclvbRIqUMWkbeaG6s1uGIhwMAAAAAAAAA0NuY9q3pDSPzniiRYaIvduhznS7nStLzJWz/2+bjNnHgBZij/YmAm5EdXrb85dohSUgEAAAAAAAAAKB3cWrOJvs2nHLDTS5r02D8cHvBcEXqTKm8yf4391m7ONBHYjgVoWjEJtsojS7nvlBIjuOvq0CAAQAAAAAAAADQ5ZSNUCNJKMmsdEKwXIN/mFNyRA6+FwxHv5weTlJ/HcEpU6hStVYL2P/m3GmTFnBgBRiZeDcR81eIHeuoRsm71lHrLEPyqkJ/AQAAAAAAAADQ5VRUXhOv8pF+IlwdSVX4mUzH6KAzJoQm/q3j6fgmwYn1leViJWD/m/uoXb4YB1aAGUsmgpmhSbkZcawXbXY54vUVKDAAAAAAAAAAALqcmmN5xry2c+VyeK6W07Eo9SfalGm2AwyI38ZJh3UFqHqCU7ZYpUKl5tn/WqLh/VOCB8zeGRQ7fyBhuzvVmMjLCq0yH2uBRjXOYhV1kAAAAAAAAAAAdDelWtWv5iPDPBw/yaxZVtlYnkwnDmxC3tFULGD7s+A0VKcM91qh4u8fQ4SpORBg9oQMPVI7nzHrezOmV4z7hPu4UIb4AgAAAAAAAACg+8mXa774Ys4VMgIkVCGJo3JG64gSvQ6LL3HblTZM+38sFd8kOG2Uq1Js8TQBzxkDAsyeGBOqHu98Hc9lWURhkc88KDoLcrEGAQYAAAAAAAAAQPdTrjlUFUJCuKqPl2rDyAOjpQVLCjAxSkUPjgzAP2VMOmBstv95PlxHcFotVHzdijifTvsqIss9P3BAYsG4IQ3GI+7OVJFGZOxH20iy4yXccdzHOaGEAQAAAAAAAAAAvcBGybVhA4l4raAzjOd0YHghTPcfnFAkdsDYzv7nwjzh37paKLuvV49L1fZpAVKAmew7GAfgaH880LB0A5QzQxHTmBmQ8xV4wAAAAAAAAAAA6A0KlZBwUMekNz099BSLWDSW6v1QJM79OqSdSbaw/9lDhp00TNjZJc8OGEqYylXaLMDEhPgy3uMHgN2OohHbi3ULhBlRsC3aqhKSo57jTMjtcjkCAAAAAAAAAAD2S7ZU3VT1V9u6ZrVfw+9Awq/hUKR0vLdDkSZS8Ybs/8H4Zq1jvVz13ttOZwxvj4+KjU/0aCxYTGz2RF8sUNGIMRPrmA3QfJ6fy7ALEgAAAAAAAAAA0CNIT45qLWjnqmo+3jqdcNasDqweTwkNoFcZT8WkJ08j9n9S6BzhiB+ugMzPlasOFdstwOhNmerrzQNwcjhNZrCbp4IZDSxQdtp4zGRQAQkAAAAAAAAAQI+xli/7drBpA2vb1xRdjIlJxiI0kY5Rr8EOGOOsXTRo/0dsFmFCAowSXXLlCrUTz+WFN6dPHIDhZG8l5B2XJaesTY3JpN56vW6tUEb4EQAAAAAAAACAnmO9VJWeMPXs3e3Qz3MoUjSy06u7iwlOvEu7s/+TkWC0D1edZu+XhXx7o2ECHjA8n0r3TkJeVr4m++KBHRyeh9eFX9vuHQ4AAAAAAAA4OKSFUTLV53oRcFqEWOTglPgF3Q8LCcu5kl962njOD8MJ2sKBfCnC9j/an6BeYSgZkaWld2v/R+3N5+WtlRxVqu11xrD1lunSVBGhfk30SELeYwNJv5KR+g3m3DJ+l7lOTxvlatt3OAAAAAAAAKD3iQmD7thAgk4Pp7xwBi5ve3YkJQaJey+sA/QuK4WKLDDjiS3hiShgN5v2P0/98UjPVEWa6kvsyf4PRSB1DFv/MZWx8XSc0vHuDkXiUKn+RMRraFrP0r8jmPnZf07DMWLwfgEAAAAAAADsFs6b8eRoikaE0VqpObRadMvYcmXbxY2ieD5OT42m4Q0D2kLVcWhZiH/a7jXte20vy/WWbzuHPWMm++Nd3145+iWq0o/s2v7vkigfzwPGr5ft/qDpdPcm5GW1ebLPdZPySkwZjYeUU0t4F1tGIqKsUAlzpfbV+wYAAAAAAAD0Npwzk4WXqf4ERVQyh7ur+cBrlvIV2ijXKCGG3M+PpWks3RueBaC3WdwoU7Vm2MaGGOM/1gl6aZP9HxHzY/3drAFY0rNsr/Z/qUsiX9Tx8P9JxAb2sRtSl2ZEnuqPUVxc8SwyMzwH/ayCZbYs6fEiUfNZoUwDAAAAAAAAQCNMDyRkeFEqGlFWk0VLuVJdw24mW5DGMHO0P0lnh1PwhgEtRXrB5Mue/ev907ayIU/Us//530AiKvOrdCNHBhP7sv+7JfNI4CrgkOMdGl5mF59IlyXkHZFJd3xhyNxmV/py1FqnzvMuSxulrlHAAAAAAAAAAN0Le98/NZqiiRTbII5nbVSEwjIvBJh6sK3hPufaHOm4TU+MJLvWuAUHg8VcWbY9y2inPu6yFVgTtP/5FUcHEl2pAQzG3XNnL/Y/ix6FSndEvwQEGLd2tk5aY1FUTFN93eOGxBe/6f6E73ZESr3zYttcpSti2Z7iZRmHhtuRvFDmSwQAAAAAAAAA2zGYiNBTY67XC8Oj624eDYvmVMjHViwJYzhfrnm2FdsyJwaTdFyM5MMbBrQC9oJ5mCmQ6wFChk3shhhJO9pQJsL2Pz/FGsDxLqqKxGIQawB7tf/5UUmcqBtdkn7EDUGyVJbgELx+PB2TWZG7gWkVehTO2qwPghX6DbZlGZO77mG2uO2FEgAAAAAAAAB4IPrMcNpN+mnYE8xqoUQrhZ0LejzIcCiS8jxQNsxYKk5PjqTEqD68YUDz4Uq/S/lSMPGuDkuyLM923sr+5zcOpaIyJUk3MJ5yS7vv1f53qx9XqFtQVZBCcWKsJKmJ/3WDFwy7HY2Ki1W9bWTM7dWPfZXM/XXzGyVaR+JdAAAAAAAAwDacHEp4o+6+XeHbH+z90ggyFEnYIHYoD0dCGJQnh1KyjDUAzWZuXYci+ZleTNt4J/uf/50cTHY8FIm9xo70J/Zs/+t/jZ6v7cDzfXOzAwcSIrvrxYOBeFSWWusU7PVypD/p79Dgng1ub+h5reLlK1V6vI7QIwAAAAAAAMDWnBhM0Ggy7tkRGr34eKO4q3ySC7kyrRfdEXg9aq9LA3O5aq6UFEdIEmgiHIp0ayVHNfFPttRt7OZ69j8/ZpFwusOOGMcH4942uQvUsP2vX7ScL3ZV/tdNZajJcO3xfpxFUgHulALG4k8iavs7VG8n+dtn7uhwY+KYrzuh8nAAAAAAAAAAYMKeLxN98YAtYdpG5VptT4O69zMFYQjXKBgW4k5pVdq62xKfgt6GRYf7a4WgyGKFJrWunv3PExfl6VQ6ktFUhIaSsT3Z/xo+X7vJ+4XRZcEDFxhGq7L6eY597IQCxgd8Un1vvR1ralluoiFjheWKLx8v51D1qEfgBGd88+mWvEMAAAAAAOBwMN0fl/lZOGVLwHKw/NntPQ7quqFIZf/jrOB38GAz54WBCAOayVqhSo+k+OdiW5s1mK3sf91OTw21PxSJPcKmVQTMbu1/PeOJxdJu0wECvm5yQ9WeN5PW6Cc7oYDxATfd/xxnCy8Y9Zz3vJhq4sFNiC89w2RfjE4NJ2SisrS4CT092S/z/gAAAAAAANBK2OAbS8W85KQBzxdlXyznS7Kq0V5hY7BQqXmfqb1gGJ5x0tPpPuSEAc2FQ+Dm1oteuzPZyf7n18eFXXakze1yUkfA0O7sf9M7hs+35Xx3eb8wbhJelSnYUvKSu/2Wf0GwyCtZdWSgfQbxUaFCJ6Numh39/XqbpNpFfvbjwESu+HJjEeJLL8A3vHOjaTo+mKTbK+6owry4UJQrVTotBJnTQynExQIAAAAAgJbRH7eE3REhL2GpRYFl9qqfbUI+yburhcCoPmOWz53q754KtODgwG33cbaohBZrV/Y/z9122Z6qXWz3TQkdYLf2v/cbxJy9zWaF6NSNKKvWUQKXY2Q+dtQLLC+jME9D8ZhQpFovwvCOPzqQJMuI4vIzHhsXRGOu17Po8uHCBuUrqDfd7QyIGwyLLwOJCM1mgy5iM+tleczH0lF6eryvLe0OAAAAAAAcPgbjuuCIXzlGL3N/dDZbbsrALhcGmRWGcLD+jDYeHWnPnBlGKBJoPjNChOG259K4/a/b6InB9thiHIqnadT+NwOUlsVA/sNMgboVlQNG/zCtvrp/9WNVud47LFwurdUXBTbKNd7FyfJLZvnP+QeBl/LlKl1f2oDnS5fD7eeEaEfnx/qklxMfr7BKuV6quO5y3BbF608OJekcssQDAAAAAIAmwxVftF1BRIHlnLAvlvLNq6bKhjALMfp7iChg7vK2TPZh4BE0H/aEkdWRlKncqP3Py/2xKB1pcdn00VRMJqXejf1vq3X8Oj637q51r/jCeEl4NVaduf5RenKN5yS1Cg49SkWDBZqkQufU3z49zeVKdGMZ4ku3wwLKBSGwcWUtho/d3S0SmvFJxOFk+ngPJaJ0QYgww4nOlUUHAAAAAAC9jy7+wBRrtZCZ59sYbLA2m7srhcB3hL9zOh2HFwxoCauFCl1bWKdi1Y0WacT+Z9jCPi7st3SsNYPhbCMeFwLPbux/8wx5JAbufQ+f7sVTOQKlp0KPzUmvn+iL0UCi+XFgvOOPDSa97zK/266znTznOuf3MgV6INQuRB11N1NCzb880Udpjm1Vx3AxX6FsqVr39XxsOXO3Gf/HCZnOjaXo6ACSlAEAAAAAgL1xcjghK70yMrluyN7h5YfCqCu2YHA3V6nSTLZQ9zt5ikYsGkm2J+cGOHxwm762sCGjDRq1//VzpwZb44gx3acS7zZg/4cnLvPeC+ILIwWYR5nNCqy+zISVJjIenxpsvgF8adwMPQp+v0PB8lhMtlihq0LBm99onlsgaD58c+OwMrOMGf8tCcVsJrt9Ob+5XJnWxXEOwwrpicHWeWIBAAAAAICDSURYckPxKA2rAWVd3ci0PbifurDROqOOPb05vCn8vZqJFDy+Qevgge4HQrS4s5Knomjrjdj/PLETRrND5NzEu4mG7H8yHtdqDt1cyvWUFiAFGD75H8lkUC6m25H3In6sMyarxxyfNd3EnX+sPy5Ur0ggK7Oc9Hao79bbcX+tQB+JHV5EyFFXw+6dlyf6aVio+PrY6ZProWh7jRy/R9lS4H0MPz4i2szZ4RQBAAAAAADQKH2cZ0L0JUeVyJEpVeSAn2kHcT+11d71D9aKAZvLMvq7KbGNUYQhgRazmC/TjaUNWi1Wd7T/9ToeCG9mXs5L430N2f8W+VXDSkJ8+XCRt7tCvYS312aEAPPhYo7K4oeEf7ycxLKjCm1bRukqDhdqxoVBVj3qN7wZVN4PvZPljlZFvgtCKX5/Lktz8HrpevqE+MJeTbqcuCfyieO4mKvQUq6xY8g3Ra5hL93QjPXcLliBfQIiDAAAAAAAaBCuwMl9ysF4xEurwAN+crR9l/3U/cB9XC4PbKs4C7a3tO3D9lE8CgEGtJ5ClT1JNqQmsJP9z4+5bT4x0hz7azylQo+2sf/lc+rc4Oc5CuajhXXK9WD+kYBsxReAD0MJeSx1MdA7wlKKk/ZZiAmL+NTQ/nc+l5uKRAwPB8u/2HjuUGLd4/UiXV3szZ192EiKE/OiUDNjSh3VbYf/FkQbe7hD6FGY+6t5OQqhLwAmE0KEaUY7BAAAAAAAB5+E0T89ofIKsi00L71enF33U/cDRyNw39gc3dfwYCYA7eKhEGDenctSoeZsaf9LYYbc4ij7jYZhe5FTSmxn/5uaBMOVcz/s4SiYTX5DrH698zjr54VR+8FXwtQbjWvDRHp/CXk5oe+geP+mGDO1n/m7qqIRXBPCyz0k2u0JpPgyweKLtem4MvPZ3Sc0qwjVc26jaJ6bgTbJ1bNakRgaAAAAAAAcLJJxX9hgO0T3IdkAZXujncYd93FvL7uCTzgHRiLamoozAGwFt/13WQ/IFra0//X6E0PJfbVRjqZJmNWPDfvf/C6mKmQZDpW61+Vlpndiy73FCXlureRdNdZTX9zn/DASNYnlc6N78z7wVC/jszyBS133MsUKXVnIinmVQG9wnE+miJ/F2ryZ5CtVmt1j+NiDTJEKlVqgKhLpzxZ/xpAtHgAAAAAA7EAwNJ7o7LCbCoHFkIVc+9McsPfNXM4NgdLVXngZAgzoFGx3XV3Y8LyzGNNmZzgVyZMje9cBpvpide1/87v4BVlxflyZy9JyobfyvdRj2zOaLz4fzq/TmioRzFk8vB1kvtByc7ic2ENZ4BPKUPf2t/HBFbHm3mpeHvhiBYl2e4WRVEyeTLbpPWWcQB8J5XI/3BIjBKZHlk1+mxxFtngAAAAAALADtaoTGGnn4iLsTd1JHqwWZMoLxg3/IAA6ikxRIvSAhXx5k/2v4Upik+ndnzuXJ/s22f9kBYsB8ZzLSx8kPWBHSZVDkq6Jnf5QKGCOkqTMXB4W+TvpqBBgdqPSTvQlaFJc6OxQwl9+nC9Xhcq1LmMiQW/BCXE3lTFTx/jhWnHfJw9fCDJCFNSfqZOlAQAAAAAA0AgVp+blltD2x/HBZEc8TtJxW22TI70ObDPvBQAdhvWAj5dzYipQrRa0//XZcmYkRdHI7nQArn5s2v96WVuKpWpNCC/rdLfHQ47CNLyXHmQK9PZsVuwIR+4VS/2zlVsDz3mnn2kwESq7HJ0aTJCli3sTeZ/H8WbvCvGliGQvPcdgPKoqHvmZsrXnFB/PB9nmnEAfL23IBGlu67OMG6h7o4qKZbhsAgAAAACAehSknWEF+pLs0f/USJraCdtEz00OyoFsZma9QGuyrK4bg1SCPQS6hPlckd6by1Ku7J47thHiENtFKJKrA7geM9pmtALLFs1kS+K71sW5cPBSkOzKQuX4rzdnM1KM4SQ4XoJeI9RkLO0m1N0JTtjDhjoZcWRFIam9Py9UrtWDpXIdJqaU66YVciVjPtxn6JEJK7FcJs38LtmGVMI0diM9NZgkAAAAAAAAwhQqm20ZZjgZpaP9u0+rsFd0LsyThvcNhyJp27YK/QV0EawHcJWkB7pgj/fHLSfduA4QCST4JbXMwugH0uslLwfbDyJ7chG4L3b4u7NZmgslUtWxiudGt1eOp/oSNC0MdfOix5/F2ZZdxRf0KuNpNweLdiHTzIvju1FqroLJ8YBmUihmYcMVZQYSEXkRAAAAAAAAIEzWsDnCgT4nhYG4m3CKvaJtIoYrh+rBw7VShaqO6+m9UUEREtB9sB7w5kxGDH7XArmKWAfY7txxE+/GA8V3GA6/u79WkOLOQdcD9nxlYcP35nKObi7lZXyW5VW7sSgVs+n0UH3vA97pp2WWcXdv18TOvrGYk591UFWuw8JQPCozYVtGhlxe5hPzXqb5Xk18ot4UbUd7UXGbXFIn7KS4odkRhCEBAAAAAIDNcL+xqBLxeh75apnFkHN7rOzSKNxnPjmU8L6b4YFMbbw+EgON3NddOwBVX8DBhM+hd2azsq26Ca0tSgod4OQ2hXkuT/V7Fb50Lk+uePzO46wUdQ6DHrBv63QuV5S5Ye5z2JBMD+PutK0S8rKinIi46XX4gvKW2NlzOSTaPQj0J/xESjKSTyn33DZalc+HRwhW+cYkmt1MRtyoxIWAhaD+uE0RcVL3xyIEAOg8Y6k4jSVjMj8Tj45AHAUAANBp5jeKmxLdRpR1yGkV+L7VKk6pdAze94vvZPFlNOWGcLDnOMQX0O2wSHh7JU83lvKUr1RlftdjQgcYqhOKxB5fKdX/49cVxes/XMjRlfnDlfu1KT1g3vHs4fDGTIbm10sy6WrUtunCWF/gdXwgjogDwhea28v5Q7ezDzoyp4+WX5QKOifaQ6sFtptLORniNLPuhh+xhxV/tyNvZMgeD0An4RG+J8Qo4pOjSSmY8v2CE7U9OzmwpackAAAA0A4eicE7XYFFF47g/qOlHl8Y72tJKBJHBBwbSPqFJMit7MkizKAaPGTx5ZHKdwhAtzMnxMz359alTVbv3JGJd4fcNl+rOdLbhR0xlvKHzxGjqVcUdkO6vpyT2ZFL1apMYsWT5qI4EIVyVcaLPVrHBeWgwSeWbbl5gGRxKzG/m2l9QmXd7phpoawOq9wvfB9LRjDKDkCnYNH9xSODsqzn9UU/zPSWGClhvfb0cIpeOjaEfE0AAAA6Ag8KPDZEDh2GZKv8FDyQd2G0+aFIz04PyC+wjTwY+nsjKqGGDD9CbkzQQ2ib7GPRz2NP5+MqvxFzbDBB6ZhNM9kCvS60gHtrhyPcqB47pyneA6viYvHbRxkZx7huJF7l+uH8HHK9HExiRgYmlj3urubb7uHE3i8ywM3ZnFANANAe2OuFvVuOq2SCD4UQu2p0IvkGfU90eJ8UAgy7ol6e7Jcd4DuZArwiQUMMC3GPw14fitFrDmvjJJYPMVIMANgDbAhO6NwrjlGVRS2Pp+NiQLnohrw3AR4s5HyZNbeSr8Tss1ZhJ4Ee55EQWZZyJU9MlOvE/Zrv0+jnNdkDJsxirhwQWxbzZYgvBxh9ZPlU4xjAu2uu90vUbo8UckoYc24srWjYKhqqiNp9ALSVvnhEer2cUOFF+ap/LTB5KNatlypeFvwjYmTkOTEiOJWOEwBbwdf4Z6f75ehx1HK7MDxKzAIMe1MhtxAAYLfwoMCDdTeJqGVcQixDHLnYpFAkvoa5xUgM7xfj+3haLcHrBfQ+fF5tlKuBxxBfXNBTAU2jWPMzyeuqR3yj+czxoZaX8uPvOau8X8ypAAEGgLZxbDBJnz46KEf2GI4BNkOPwrCLqklKXCcuTfbRk6NpAsCEhfwnR1LyfjKSiElx/e6a334+WspRXyxCrwgRRhs3AADQKPdWC7RSLMtlTxSx/Lms4tqEvGWnledn4ItU3kSmUK7R4kaZAAAHFwgwoGlol8mCUDcfZ92ESi/wKKXoOJ9tcbJNHpmQ+InkZTKzShUeVwC0GhZA2XvlXChOnhOsbeeyzc89YLHWUpXT1PzEYIJeOQ5vBuByQgh73B60VxW3k/fn1wOv4XDnW6s5ed0/Iwyc544MoP0AAHbFRws52Yc13VI8LxixcFJci4ZTe8/eMJKM0hHOieF51ljeXFeRfZhtfe5EAEBnQe8ENI2s6ADzTUSPSk7LUuQRmVGeO9D98daUhObvGU3F5Hfbfi55WdrMzEEEAGg+7PXy0tFB0bH0z0EeySuJTizngdqJu2LUkR3VLMvvjPJnJMW1gwXc/XR2QW/Dwt7zog08NZqmmG277Us0lMfrpbrXdh7BlmFt4h97ybwo3js9gJA2AEBjsPjyzuOsnOuKSLpPqYWYp8f2Hop0SQwW6nuk9njhuQydF+sXcmUxKIFcVgAcdCDAgKaxWijLW9Vq3h3xPtYfkw1M37SeGmt+WAF30J/gkmaOH0ur5ysFxNAC0CrYs+2FIwN0no3jiL3JZfva4kZDOb/4NTdXcm6yQzKqQYh5SogwL04NSgEXHC7ODqfoZSHssbhuphErCGH99jbC3o3lnLzv8HuSsQg9Pd4vpj54wwAAGsIXYapeVSJ5DVL9TB4c2ItX9xMceiSuSfKjHL+/KhGP18sV+kjcNwEABx/0SEDT4JvWYr5IeTFn42w4abhZipY2JkbIjzR5NPLsiHtD8zOYqZmYLxzCuvIAtAMWPl8+5nq92MY5p4UTDivajQA6my3SSrHkfYb5efyB54V4y+c6OPjotsXHW48yuyGlrrFye4fqehzWxqFv8j1qOjKQoE9NDzT9/gMAOJhwf/at2SxlVTJcfQ2SiPnJod2FIvF17Yy+h9kUEJV5cXajSK8/yqBQCQCHBAgwoKlcXcjJOScYM+4v0kOFb148AtCshLxHRaf6mJhMo03DVZgWkMQMgKbDHckXjwzIUUCzQoQ+BXnU8NbKzqFHYa6Ja0fZcTwRR3+unrNHxIkheMIcZE4NJqX4MhB3DRvdvrSxwtf12ezOwror0rghSroNaW+Yc0LMa3VSeABA78MiDIsid1Zzrme1FSzycHmi8VAkFpS9bqqhsfA6vl5dW4DnCwCHCfRCQFMx1XtvRNywzthb5eRggvaLTOw7EjTGzO+6vbp7AxAAsD1SfJFVjiLBBIVq4uWrDYYeheHO7kNdrto4l805e8IMtCiXFOgcMpzt6ACdG3fD2ZyQJ5Sevy1GpBuB299VYdCYbUd70JweSslKSUmEJAEAGuDWSoF+eX+VcuWqf22y3BDZsw1UXOPBQp6cUJ+46tTo+vIG3V5BfxWAwwZ6IKAl5JWLuJ/hnVzVX0xPjqT33fk9JUbC09GoMUKu/xEVy42NkgIAdseLwkjW5TNDTmfy7LsvBJSV/N5zL90T78+L89fNB2N5n+vO3RvW+TGUqD5IcHL2l48P0qhK4uweZytwTddtK79N6FEYDoHj95j3CC0L8v3ncyeHEdYGAGgIHiD49YM1urPiennriwkLutuFIvG1hgcLZZ5C8vvC7KH324cZcY1Cwl0ADiMQYEBL4BFIXX7W60xb7sRcnuynvcI3tCdH02pk1M8kLx+J5Q+QxAyApsPhg32xqGcWm5Uc+N9eQ49MfM8F95y2A3N3GkvHKRXDresgwEL6Z48PG+3KvYa7c/c1/JhDj+6v7b40K48s58s1v7qW+lBdcYsHAz53cgTeMACAhmBvmLdmMlSs1rzryTMTA1uGInmDhZYvJ3OOtNeE+LIbQRkAcLBArwO0jFvLOX/00fLVf3YD54S8o3ssL/vS0SH3M8kfTdDu5fyd+xmBBwBsJqVET10Fwky4y/D8YzEy2IwEguy5sJArenk/bCPuXi+ztwTobdiT6cJYn9eO7FCbIj1i7LDRk9uTsVIW7fGDhfXAZ3vtSc37hJj3eSHCnEJ+IQBAAyyLe9RrD9fokRBS+HqS5vvjyObrB983Tw+nvOsOC8lvzK7RR0s5JNsF4JADAQa0DL5JPcoW/JFMz//S7fxe3mbUYCueHElRMmYHhB3dkeab4ceIpQWg6TzBCQTNvBzGc7w8s16kmSaG/X20mKNy1fG+x6xAwcspeCz0LJzv5fnpfjojDJNNcWwKM0/CXK60r7bFgt69VTcUSUXBut9BwfwyF8f76LnpAZnXAQAAtsMVdzfo/fl1KaxwKNJoKjgw8GkxWKivMx+LwcHfCNEGA4QAAAa9WNBSrgulP1Osup1fY/Sc4ZHH00ONJ+Rlo+spDj2q89yMEHreRxZ5AJoOn3cnBv3RvUAlCB7VK1el90szYW+HW8Zn2obww5MePeRtQ0Wb3oHFl5eODdJUv3vd38qbyhRHPlra/3Wd2ye3U5soUDadjO9kpvviwmgapIEERBgAwM48yhbpd7MZOQD4icl+7350ajhJadHHXc6X6ef3V+TgILxeAAAa9FxBS+FRgjdm1mjeKAntOH7n98xQsuERx0vjaa+ihW3kCWBD7co8xBcAWgHnydAeKF7Yn2G8usZt82PZ764VZOc1YJCr8z9bcksMT/bHdyXigs7BYtmrx4dpMKFKTJtPhu0S9eStJrUtvg+9v7BO2g0mLPbw12thho2mV08M07HBOAEAwE7wNYoHANnLZSzpXt+G4lF6XfR9fzeTacn9EQDQ20CAAS2HO79vPfazvZvJFXm04JmpnRPyHhtICGMr4SVqZAplh373KEM3lxF2BECrGO2LecapVl/kP7HyUaYoRgBbV3FMetZYZtiIRQUhvizlXUF3KBalsRQM5W6HRfaXjw9ROu5X0NJJKd0E7eqx5SfI5ePczGv7cl6FItmb3W0s3cbUdjDPTA7Qk6OokgQAaAz2hpnbcO+HV+bX5TUHAADqAQEGtI1ri+tihCBPliGjcDaXsVRsU+ysCXfez42lXa8XZQDyyPivHq14hhgAoPlwoux+6aFmBc5b/lso1uhmk0OPwrhGc9GtuqTO/6WC36kdE+LQuLh2IAypu/mkENnTsfrtiNRaf+7+vbmy+6pHO3FTjFAXVFUks4KXV9nLqLrF07nRPjo+CA8rAAAAADQP9FpBW+EO8G8frVKhUnNHHdXo4yenBrZ8z1MjaeqLuWFKlapDHy5uiM9Yk0k6AQCtg8NFdIUxPbeV18CNFoUehbm5vEFVxz3X8yVf9Dk+kJBGvaWqUIDuhPN2jadjXiUQ24spo01tS8+5TOvDbPMFGPbGfHcuE8w5o7bFzA3jGM/xvWm7AQIAAAAAgN2AXitoOzyqzSLMg7WiV5q6TxhQ58Y2u3ufEEbWyWF3BLJQrcn33VlFyBEA7WAs6Yb3OCpvhqPKyDxqkYFcDzaa33uclR4JN5Z90efcuJ+QW+cVAd0Fey9yuWmNbj9SjDHXKXh9Waz4uIWeVXz/uaO8a7QWZBvfrx9bOs+YmD51ZBDVkQAAAADQFCDAgI6QE0bUlfmsNKxy7A0jhh/PDqcDndyoLUSZ8T7ZEb6zmqNf3FuhtWKVAADtIc4l3zkcw7bcubBGc7WaFELayeONEr3xaM0Tfc5whQl1rWADORaxCHQfFybSKreL5eV4MfOsMLZyPdGCx42lnLw/tBL2quL7ThjfK8by8tQw8YhbvQkAAAAAYL9AgAEd5UG2SL99uCpdzmMRmy5P+KOlF8QINxtWv3mwSlcXcgg5AqDN9IVH/VkMXcm33ECux2OV3JBF2rMjvmHP2xSzIcB0I6NJN3THr2RleaJGeJnJV2uyfbUa9qq68jgTEofctmSKQ962iWkgEaXzY0jKCwAAAID9AQEGdBw25t59nKXXHqzQsOiwj6Vj0sgaikek1wsS7QLQGbThzHEiFjmUq1TbYiBvB3tVcKlgd5vIn4Ougsuwcu4ufWwcHX9ETqhd6XbmSLG9XSzmK3R7Je9vi9oGHSelt0ltvFx3fqyfhhDuBgAAAIB9AAEGdA3cIf7hnWXKFCtUcWr064drHRlpBwAEsVXm1NeUgczhgZ3IiSFzQg0mZfU0M0ykXjgJ6CypmPZucR/LMDaj7LRcZ3ib3F8rtP16f2Npg/LlqtoW/mt55bHVIzJLZjOXJ/oIAAAAAGCvQIABXQeHGiHcCIDOU6nVvIoxD9b80KOL42l6Ybqf2klMiD4XOSeU41fLYWRemjJyQ3UbcXG8bEuHHvnr5TrHX89z9qy6sdLevEIMhyK9w6FIZHrBGIl49fYay+PpuPTSBAAAAADYCxBgAAAA1GWtWPEM0+sq8e7JgQSdHUnReF+cnhhpX04MzgmVjkfIjDfShn2+AgGmmzEFDL3CMpZvLOYoV+qMFxN7XnJ+IYdcjxzL8ktTk1Ga2jKWL46mCQAAAABgL0CAAQAAUJe1UlWGX9w3vF8ujPd7oSPskZJuQyjSeComxR4vYapaL8OPytWOGe/A5wmuTBXzuxQ6c5dZTUg/JmNdplCh+5n2lDTfirdnM1SpunmObMsMO/IxkwZP9CfgBQMAAACAPQEBBgAAQF3WCmWZN3V2wzWnOfyiL67LP1uyctkzbQhFeuHoYCBfCBk5ORZzSNLdDTw51kcTon1oFjdKKt+LJdtQvUpDPH99do06DYcivT2XldvmBr+626xdYTwByfGFo6MDSQIAAAAA2C0QYAAAANSFxQ3OA6NFjtNDCTeBh7RE3fmRFnsDcOhRX8wW36SrHbmeCl5umg57TwAlzMUiNJj02wGLGkuFkjxuXpuhYK6VDxc3usZ7aTZbpMU8lzpX22s5gRwwst1Zfhs8NZiQAiQAAAAAwG5A7wEAAMCWXFlYp3LVNZI5Bwt7NbA3iq1qxLCB+qkjgy0xRtPCqH96ol96HdiByjTucqFcpQV4wHScCSXATYSEuPmNMkUs1V50aA+5okahUqVbHUi8ux1vzWSoWtNhSJYn8jG25w3jLsdFex9KtL8SGAAAAAB6GwgwAAAAtuTequ9hwl4OXn5SXYnIcdc/1YKEvJ8/Pew6TqiiaGYyVP7uq4sbBDrPZF9MtonRZJTGDRHm1nKOSpWaK2I4fhJenl1d2Oi6anec54i9csihYDsn47GxHmFIAAAAANgtEGAAAAA0BHvCmKlYJMoivTTR51YpahKXxvuoLxrxKuYEvleVnr63hvCjbmBICC/aVcQUJTgM6eOVvKufGVWE+Lh167G7uZynhXyJjLQvXkqYQAUuMU31IREvAAAAAHYHBBgAAAANsbBRDlYhIvcmosNLOBSpGXDoEQs6RBRIvmt6ILAHBeg8w8kYJSIRr02cHUoGwtFuLueo4hheJOJ4Xl1cp27mzZmMEI/csDvd/szqSKTmw4ko8sAAAAAAYFeg5wAAAKAhZtaL7oLKg6FdUxwVs8GhKKeG9h+W8YXTI+qjfWPXndxl9qqA90t3EFNxaPrYxKI2PTXqh6OxF8y1+azXVq4urHd92XAORbomBD6z/bkLamYokH0xdKMAAAAA0DjoOQAAAGgITnirywub2TsswzfluemBfXkFPD3eR/2xSCBpq+kDw6Wx332cJdAd9Mdt7/jrY3VuNB0IR+OwnrtCNMuVqlLY6AV4m7mtM77eYhmpoN35MIdfAQAAAAA0CAQYAAAADfO7mTXKl6teeV43BMmvbsPVYS5PpGkvcOjR5al+77FleBzwIhvwv3q4SqB7YLFNHx99vGQbGO8LvO6N2Qz9650l6iU+WFj3Qqd0OyfyfyvPY7ZFAAAAAACNAgEGAABAw2yUa/STu8tSDGHb0zGqEmkR5txYH02md5+g9MunRwKfZS6vFcv00/vLXR++ctiI2zpMx31sq8i0syOpTW2g26oe7QR7fF1f3pC/xzFEJsto64koulEAAAAAaBz0HAAAAOwKFmF+LESYDRZhKFAcRsLrnj0yQLvh6ck+6otHqJ4/wfWlnBB9ViC+dCN1QsV0x+LTx4eo17k6v+G1c425zF5bAAAAAACNAgEGAADArskpT5iVfMVdYVQrYj+H0WSMzhvJWLejTxixn5jo37S+IvSWd2Yz9M7jbM95TxwWSuHjYvn5gTiXz+U6x7WX4CTCr89kvMduymH9AOFHAAAAANgdEGAAAADsCfaE+ZfbS3RjOSfT8uoyvW54hkWfmBoIJGPdii9x1SMKlvrl8I9/urVI15fzBLqXcrXmH3cx2WRWrbLowni6oTbQzcxvlGghXzZ+p9/Oy1UCAAAAAGgYCDAAAAD2xduzWTlxhJA2UhlOxvqZY9uHoVye7KeBRNQzbIWmIz4rQz++4+aZAd1Nqeb4ZZqJKOyn1Egb6DaePzKwyXPntw/WPNHFr4bEXloIiwMAAABA40CAAQA0HV2GeD/liEFvwXla/vnjRU800Tb5VF+cJvvjdd/DoUfPTPZ7r59bL9EP2OtFfBboDVbzZTnXuYB0clozkfK0aAMXxvZWGavdcJu8ON5Hz0z1B9rtRrlK78+ve491Il72AAIAAAAAaBRYRwCApjIpjK3PnxyWCVVHk1H64/MTsiIKOPiwkfr3NxZcQ9VxjVQOK3rl2FBdMe6rZ0e911yZW6cfweul5+BjXpFeMH6HwlL/bHVsmU8IQSPeA4Ist0nHccUV9twxt/n64ob3W3X7Xi5WCAAAAACgUSDAAACaAhvYLxwZkAbM7dW8rBwyt1Gix2L6zPEh+iMhxPT1eC4I0BgswHz/+gI9yBSFnepQvzjuF0eDHhBskPN6bif/7eZCwLsA9BYrhbIMPXIs7fnkqH/uEqsZLGS83OVVkVgo5japS03zsum5w+FWt1Zyfjlq8Q/JoQEAAACwGyDAAAD2DYeZfOupMbo00U93VvJ0e8VPnPr2TEaOGg/Eo/Qn5yelNwSEmIPPerlKv7i3Qr99uEbrQmR5ZnrAO+4c5vHs1AB9tJijH3y8JAx4eBH0MstCgLGlx4sl56SXLX8d/zs1mNwyHK3TcJv8pBAF3Twvlje/MN4X8IJ5KERFnWCYw49WVAgWAAAAAEAjQIABAOwZ9nr51NEB+toTY2K0OEobpQpdCXky8Kjxe3NZd2RcTE+IEeWvnx2lJxCWdCi4JcS4v7++QK89WKWLY31yHRu6P7y1RG/OZqiEHBo9z8O1op/wxapTnVmvE9Orx4e6MhTp2el+KRKzP4vefp4noras5KSRXn3rRbkM4RAAAAAAuwUCDABgT3B+l2+cHaGL4361kHfn1qW3Qxj2dJgXRou+4PQJQ+eVE8NSvOmFvBBg/9xazUvBhfnNwzUZmgYOBixKmEKaocUEk/OSe+4/M9VH3cSIuJY9MZL2tjM8PTkSDJ+bV233QQYl0nsVvu+wEPzi0UGK2xZ9TQwKwDMTAABAO4DlAwDYNVwl5FvnJ2gk5YYTcLLN26HQozAszsjRZfIrpbB4861zY+j4AtDjcOihZQXFF/6jz3lGL18S5/10F4UiffH0qJw7hqeORM05F0y/cY1azlfkU5zjCPQefP/6k4sT9MRoSgwObCgvzXX60wuTsvoVAAAA0EogwAAAGqY/FqGvPzFKnz42GBjZ5kSqHGa0HTxK/qHo7HrlaVUVEXb7/8OnJkSnuDfK1AIANnN/reBdE3QZapvcKki60pV+juefPdEdoUifnBqggUTEvZaJa5LtuHPXY8ev5DRlCEac94WndVTs6inYa1Pev44OUlK0vSuPfY9NfX96TrSHPxXiTD8GBQAAALQICDAAgIa4JEYN//D8OB3pT3rrdLWQdx9nGzJG3lOv0+/TAg7nWXjp2DA9i9FHAHoSDimb5TBDO+Q+Qn6VIDO3CguvnT7fWVB+eiLtVzVSF6SAFwy5NacTtt9d4gTT/3BzkUDv4N6/Jt37F5cPz1fp45DHJg8icFl1zmf2h+cm5HsAAACAZgMBBgCwLTxK/eqJYSGQ8Ih1RI1iu1VAuCfLSVY/XmksFwK7ev9uJuNVGCHSn+Py3PSgHJ0EAPQeHMbheraZIkwwpkdXEOJ/XDVtuj9BneLZIwPuNc2yApOu4kT+VlM8iu5SL8Ii2zeeGKOXjg95Qht7Nv3k7tKm15aqDv3q/qp7vMV9j9/zjSfH4A0DAACgqaBHAQDYEu6E/r7ogD41lg6ODDt+6NE7j7O7+kwOVZBVREL5ItTHihHpfnr15BABAHqLx+uuFwzjeblZwdeYjiW8/LmTnQlFenI0RU+Npt3tc4wnjGVPPgq/BvQEnGfoj9hrcyBBjk5AJObvzGW29NhkT65rC+vesZ/uS8h7ILcXAAAAoBlAgAEA1EWLL6OpmHxcL7nmdh3Z7filGGUsV2uBkARSeSN4+dxoHz03jXAkAHqNd7nkPBlCCxk5YYyVWtjgcI9OnOvPTQ8Eo4z0ohkeqZb5WrdcKBPoHZ6e6BP3r3GKR13vFX2v4fCxdx+vb/tebsP8OsZWbfRzJ0fENAxvGAC6lJNDCbokzvvRVFTOAehmIMAAAOrye6KzOZ6OBRJnei7cYvp4OSemvZVhZdHm2sKGXNZGmTfSrObPTw92NDwBALB72AuGPQiYrUQX2/B+4+Wn2xyK9LwQXzgHjbdNpBMGU6CSExnPLechwPQKfHw5ZFYeU/Lbmy3zlWV2fD+HIv36/op/P1LvZY+pP3gKIUkAdBMsuPBgIecRZA9rrlJ3eigp+7A4V0G3AgEGALAJ7sCeHlbJdq3NhtP6HkKPwrwt3s8hTNqjxjI6yXrdc0fgBQNArxE4t8kQNqxQCJJxrv/eqfaEInGH/LkjA942eSKRITLbIY88DktBxaPegO9dz4vjGw6B4/mNpRzdbHDQYEYIiVfn1wMiok4e/c2nUCUJgG6Az/dvX5ikowMJKa7q6/Qv7q/KPiyfqyeHkgRAtwEBBgAQgDuW3IFlwqEEOg3C27OZphgkvxCjjIwuX6s/X486T6TiBADoLdiD4Ed3llSyXZewV4l5beFzfVAYtlyRqNV89ezoltsk58pit411N5Y2CHQ/4XuXeT8pVWu7HjRgITGr7nNmmx2I28KwG4cIA0CH4HOPhRcptpI7KGiKq/z4rdmsPFe/Jq75Lx1DcQfQXUCAAQAE4BEFvwpIsDII/+Ob3M09hh6FmRWjjO5n+Z/Pw4wOuRNXHtGhAgCA3mEpX6HXHqwSBaqdBSfLrP0spheODNGYyjnVCs6NpsTnxzdthzfxtUdVceLJEVM21LEH3csL6t6lJ9uoK/62MMZ2O2jAQuIv7614n2F+Nt+XPn9qhAAA7eUpcR3/kwtT7r1CnZc/uLm46XVXFzZoJluWr/nE5AB95/I0RFPQNUCAAQB48M3p/Hifl3jSDBng5Y1SRXq/NJPXHq7K8tT1kl/q8AQAQO/xgegA8/XCDAOxjNAeuc5Yz9MXWmTUSu+Io0PBcKjQZBMFqjaVK7W6HXvQnZweSdcNPdooVqQxthc4FOmD+fVN7ZSnYwMJenoSyT4BaBc8QPiF06OUiFpeuPrN5ZznqRbml/eXqVx1VPhghP5SiDAvILQddAEQYAAAHi8q9+2tePNxZssb3V7hUca3Z9a2fL4ojCDmsujodqJcLQBg73AYx1szQdF2u4rOo+lYSzrIfG3jDvh23x1+7mf3lpt+vQOtIx7ZrNbzmn/cp4j2Nt/3ipvbAbeXF48M4r4EQBtg8eWFo34oEZ9/68XtBwX5+v2W0b/k68HzR4bo86eGcd6CfcNt6AXRt9Ceu5cn+hr2skLrAwBIuPN6bqzPrwhCfh4EnssEhkutccXnkfLZbClYkURMy7mSjN1nzgyn/cTAAICegUWYd2aygWsKUfBc1495erHJoUjcIeJrm/n94etc+Hr3s7vLdG+tSKC7GUtFPUOqIsT88LH8YD67bxGNBwl+IcQ4s+3oib/73FiKAACtg8WXF4X4Yp57TCODgty/fCz6l+Z95oK4H3z97CgBsFc4pPnPLk6KeVreIzTsZXW5Ac9ICDAAAAmX7fM7riofC+mqR7Wmhx6Fee3hijJ+9PdadGM5J5c5QeeR/jgd7UdSXgB6Ee4o/+bBmneOR8g/1x0yxQ933ZdON69z/EfnJgKij9mB19+vr3n8/T+7u4K8Lz3CJyb7aSztinVL+XLAi4krcb0/n6NmwKFI782ty/ZhtlVePjMEAQaAVsEC+qeE+GKrvE76+p0T/dJGBwXZm7EkBVr//OUQws8eHyIAdgPbIv/duXHZR2Gv2rekCFiRz2mx75Xjw1Lg2y6HJQQYAIDk2GDK7bzKu5tDjtGVfXN2reWu+Jy0833RwXVk+l0h+pQrdHfVHYHmCx7H+3KpQQBAb/L+wjr93YfzlBXntr7OMGZ+DX3+j6Wj9Kkj+69c8cxEPw0kXJdgndtKL7tzS1XMcahUqYrtm6Pry80x2kHrOTaQpLOqzOydlZyXF4KnN2ezXse4GXAVJdl2iTzp0FL3pYEEksUD0ApYZGVkr9RxvGv3f70x3/BncP/1ylw20K/lpcvis4+gXwkaIBGxpbDCAzrH+hNuCJxoVzdCIuDP763IvEOnh1NSqDk/Vr+6IwQYAICEXf5to9qRrSqBcKWi60vtMUjeEh3c9XJVWkfXF3Ne5/lFGfdr0WCidRVSAACtZzFfpn+4vkg3xPmtrzPuqKZRuUZdhz4x1b+vKmjsOcef4V3PQt9n65LTYr5RrtHffrQgtw/0BuPinjUohA9OHM+d4xvLeXeggO8f4p51vcnlw4vVGv30zrJfGVC1I14+2g8jDoBWwP0+fc7pPionxt7toCD3L3mgj4zP4vmXTyEUCWwPezn+95eP0DOiP2G2n/96Y3N+sYywW97ikGvLkvenL54eFdOIvEeZQIABAEgmlBu36ZrPyz+9u0LtQndwZ9eL9IYKeTo/mpYXMT2qiZFGAHob7qD8RIwS/URcW9aVyOqGARmV0MgdceKOy17hhI18vdAjpp73i/EaXl7Ml+j7Nxaa6i0BWg/nLeNjyu3kGTGS7QkkxCFvWWoFHIp0Z9Ud8XQ9p9z5eAr3JQCayZkRN7SPq9GZYaPsdXBlj1XNfvNgJWD48mcOJiPiu5BfEGyG7y1/eG6CvvHkmKy8pdsgX/fZo2qrPsOVhSw9yha9dss5h/7NxSkvXJaBAAMAkHGMJvrC8OZspu1GCXdwv399QS7zCPanjgXDEBJ1Kl0AAHoP9lD4/vVFadB6HRsn2DHhOP1PTu2+KhIn7L4wlnaNZKW86KucmSfkynyW/vbaPGWLEF96DRbXIkpd45HJRNSW94+/vTbX0uPJgxI6ObxutwNJCDAANJNPqaqci7lSYP2bM5k9n998fbiysB5Yx/eHZyYGCACTM8Mp+h8uH5F9EBM3L+bOIuDPjPsEw6HQfy5EmE+pSl49I8CwCqV3AhtlGAUHoLloz3+ZJ8FyLzBvzLQ28e5O8IXKdT8l5S5Km9z4AAC9C3vD/POtJZmgt1yredcf00WcS/3u9p7/uZPDntu6eV2z1GeXag799N4K/frBGoHexVF5WFh80TmDWh1Gxp42b85kA/dM3JcAaB5s542n4zK/Eufk0ucZJ9r+aJ+hhW88ytBGuRI4f48NJnAOAwm3g8+eGKbff3KcEjHLzSumJr38VgMiIPdt3lShSLrfwfOeEmD4JPzj8+OBErR/cWmKvnJ6BEIMAE1CVwDR87+/sUCdhAXXi+N95GelcatOFA1FGQBwMHhvPkt/c3VehiRZRqUKnpLRCH15F6FInxYdnKF4zK3qZvkVjvS1bSlXpL+5NkcfLTY3RwhoP+Y969mpgU2jla2C2+vMetFoWQCAZjGejspz+uJYWgmeGXmW/ZMQ6/cLf96Pbi8H7gn8bzyNHIOHHRb+/uLpSXkv8asyWl4FLl6+t5qnDxsUAfk+8Wi9oN6vK+ep3HPU5Tw71U/fPj8hFKmIVJIYVpU49ur8eD/9T584Qp8TShWEGAD2h9mB/Ghp3VN3+Rw81oEs8V8+M+Jtl2UEALe6GhMAoDPwvf27Vx7T72Z8rxR9/h8fTDYUisQdqE8fGyIzWNvMLfPuXIa+h5CjA8FyzvV0Me8PXz49Kr1hWsWror/5aTWC+cbDNa9dlTEwAEDTiCtvlIvjbv+TS8D/5M5y067bHIrE/VyvGh4hv+Bh5+xISogvU57Xve5CmPcXXv7FLr1mf3J7xR04doLru1aA4U7Uty9M0KsnR8Tol00/vrscGPnmkzFbKsud8ez0AH373IQ4UdMEANg9buUIkhOfU68rsZNvfHwOcqeznXz6mBjB5opHFgVukHwNKFbQ0QXgIMOhj9+9MisEmXLg/P/00aEdO8navdfSf9SUKVTov1yfp18h5OjAkBH3LbN98PJgUghwTShfXg/ulz4n+psvCYGP742PhBE3ky3I780ggTMATYMLL+hrNwue3Pf7sMlVzX51f41KlZpnYIdzIYLDA7exb3LIUdT2Ez4bwot+yINDuxUB+d7AnjBmf4TpSgHm4kSfVKGODyTldn64uC6zCZvwyfjj28vuA/GiIXHT/cqZMfrT8xNQMQHYA3xR4RvRR4u+98tXzo7IdZN9cSmKtAPu5L4kDC3GU6DVn+VQMjYAwMGEOy3fuzpP78xlvfOfB2O+tk0oEg/CXJroC1w3uK/wu0dr9N33Zzf1I0Bvw8f2EQsgxjo5KHekNaFIf3xh3Ft+WQl9rz9ckwObjzK4NwHQLHR/1PN+nN59Ivbt4DwffP14/ZGb5zBka4NDxFfOjNBLx4fcinZG58HTS1Q7XBODOO89Xqe98DvRzjiZtNnOukqA4RPiq8Lg+8qZUUrFbHdUQZyEejQ+jB590G498kQdStH//Mkj9PKxIQIANM5DVTLt3Tn3AsOun9ILRcEjf+0QN799ccK74Jnww1trBQIAHA64g/yr+6v0324uuKIwJ0scqt8Z5/7DZ44N+2WsxR8WXP766pwYtepsMnHQOmSpTyNJor5tcChSM2FxbzgZ83rl3A55tJT7oaVajRZanPgXgMNEseoEDOCXxaBcM0MLv3N50g1tms8Kw7isvNgQ3n6Y4D7Dn5yfoEvjbn9Cti5H2R6GriDXiemN2cy+clDKvEOGXdM1AsyxgST9pTgheEf4ApQlO07bufv88PaKvPnpH+Wovcaj9SzEwBsGgMaYzZbkubao4uovjafkXN8A+WL1tSZ3asO8dJxDj6Lqe61Ax5p5mIEAA8Bh4/Zqgf7zhwvSG5bhAZbwvZ2vHf0J14U8W6rQP95cov/8EXK9HHTerTMiybeL4VRUtJPmhM6yV6b+LHMEk3MGML+8u4p2BkATCXsrsvjyuSaFwnPaCh5c/NpZtz/77mN3kH8dYYSHBrZn/vTiJB0XQrr2dgmkPAgtf7iYE9P+QuC4Ot/rnEy6W0KQeCd8/tQw/RuxI4aTcSKVTZ6zDV9bWN/xB7ObMo/Y65ui7WW05rCkGP3by1PCkOwjAMD23FrJ0eKGfwOa6It71Uj0eXViKEHHW5SQV3Zyjw575z/LqbZRYWJxo+yJQwCAwwXf638kBlx+KEaRyhWHvn7WF4Nlbo6pARnP//rDDP3HD+botriegYMPj0jOZArqPuXeO3Qf8GUxENeMyiYvC3FvUIl7+vNtYyiz2bkpADjs8Hm9Xqx6dh3PObx0v/1Pvlc8ryrccLJVFlFvr+bl9y2gf3koYN3hzy5N0kQ6bmgGfkUsbfO4uoL7+Lczzckd9+5s1hPrOyrAcHlp3gnPTfm5JdzRdovWSmXxgxtzG+YY3Kw8US0jkah7c0xFI/S1J8bo8ydHWpoZH4Beh29A//CxW3qab1Jc+tVSsrDjzqQU/NWzrakywdcCff67WEYcpiVzQQAADjc8KPN3H85TQYgtOs/Hc9P9sh/wV+/NihGmNZSqP2T8qxDmvM6fdh1XfiqmULcXzg6nXM9syy8f6qg/SAgPQOu4KoRNS/U/9fn31Sf31/90xdSo52H9xLBb5po96XA+Hw7Y6WMiFQ+sM8NX9RK3OV767aNs0zwcua398Jabv7ZjigS7gP35pQmaFCIMGVns9fLrDzK7+sH/atSGlx+hyz2pOeevYG8YhCQB0CBGyTTz4sSum6Zo2gy80CPL/27T/S9TLu/b/Q8AcDDIyBCjRc9N/ef3V+WADYSXwwm3h9fMEUojzn6iL7GvUKQvcNLncD4ypfVgxByA1sHeAnxN93JycMGVeEzmg9kLLLbIfB9GP5MLuDCvP0J1vMMAH/+nJ9ycL95lXYcE2RSMMXVc2+O3j1apmTxcd/stbRdgeGSdw42+eGqEEhHXpVPnmFDnF12b36BruzS2+AfdWvHfw59nEwUS8g0Lw/EvhOjTqhAKAA4K3KGVNz7yzyGtx/DjzwjBZKJv/67dDF8TXhEdZH3+EwUFH17/24dIogkAAKA+7AH1MJMP9Pn0Mo96T+whFOklb7TcxfadrGU/FXlfAGgd3Ad9W1XBkzadOv+ePzJAxwd3b8d9/rSfpJ2NbV4uwevl0MC2BtsujJfjxbimy4FfCt4/Xm+h7dFWAYbLS/+Pn5yiE4NJ+dgyfrib94ENv3JwJGMX/Pzemncymd40Gn44INTTP396ClWSANiBxVzRF0RI51jyz9svnGxOQt4/V6FHtuULp0T+DVcKsgvwfgEAALA1/3BzSQ4emOKLnn/9ibFdfRZ31j97bNg3/nil+tz99FMBAI3DXjD6nDa9sr/xxO5CkV4+PuQVeGAc5WV9axW5wg4LXM5cezwxnqhnBTUD7X1/VdgdV1toe7RFgOGEN188NUzfODtGMTsSUDK9MAM18Uj3XkcVXDfUjPxsPWSvDTtzJ3NU1yviZIQIA8DWvPYoEzhXGbNTe3IoIUP79gPfFPUIo5zUDVZ+p1jOFtHRBQAAsDM8Yv63V+cpWwiWk+X7yVRfXJYpb5SvPzkqb0rhvmq2WKO/ubYA7xcA2oA+p0sqFMlW5yGHwjdqw7GY+uKRwcBAH7Mm+pdXMbh3aLg8mSLLS67r2hie54shvvBiueYIG6i1tkfLBRhu+N+5NE3PHxnyhBAf94Gl7m4fNEFtemc2Q/O5kpfM07I85yL/u9Rzr54YlqEPAIDNPMwU5Tmph/1sMzmumr9yfHjPCdHkCKMQYKyAEuues6zDsKD61+joAgAAaBC+b3z3/VnZF7SM+xbfU145MdRQ6OylyX7pqa16qGqtRZki35Me454EQBvhc/p7V+eEGOMGqtuqj/jikYGGzmc+7+MR3x7kv+ulGv3dtQUCh4cTgyk59+4Luj1YfgoUfc1/aybb8ut8SwUYNrD+4ulpGvdOEPMEsJSbqLucKVbpNw+bozb97O6K//mkFS0/2Ml0N/qMODEhwgBQHz6XFpSg6WJ5lZGYlBBfXtmjJ9l3xLVBn//+VcGlJAYwv399ER1dAAAAu4JHzX96b5X+5fYSrRWqASHmG09MbPte7re+KvqEdqifurBRpu9dm8c9CYAOwAmvv/verLQVGVv1Hf9gh/P5aSGmXhaTWTY+I73YHtMazuVDw6AMP7PqhhsFrBDL1SNea3Li3Xq0TICRni/CwBpKRChiGy6cjpH8xsvqSUJ8WWnaje2BGLl/W4x+mG5F6msCbkZ63SsQYQCoC3dkeeRBepVZITc9pWm+cHSQjg/tLiHaZ48PiwtiRH0YBeZ88ft/r8zI7wQAAAD2wgfz6+L+9ZiuirnuD06lY9Jzcyu4PziYjJjDoaI/maXvvj8D8QWADiK920TfkL3bNBM7nc9s27Gtqc5/FlIhvhw+kkKIqGf/a9cXjs6JKEXk+zfmqB20RIBh8eUvPyHEl6Sb74WTHdl2MCEaGcsPMoWmx+H9+uEaFWpuQl4vcWgoBEqrYLz+syeHdm1EAnAY0CLMx8s5w48sOH1zh1EIE1n16MRQ3WvBx6s5eYPFzREAAMB+YaPtn24t0U/vrVBZ5ZHg+89kndAFvjd9QoyW6/taqeLQ319foJ/cXSYAQOfh/uhPxLn8z7c44XZVns8cijRoJNjV8EDfsLJDeXr7cZa+B/Hl0JCI+BIHt5ut7H+9mrWKq4vrNC9EunbQEgHmS2dH/NFthRSZjB+vf3FR3OD++eMlaja8s197sOYKQMb3Oo6ZESa4Td98snEjEoDDBJ9P3BH9jTqnPNQyjxg26kX27QsTgZOQL0J8HfjJ3RX6+48W5HcBAAAAzeItMWr+V+/OygE/vv38fp1Bg++IgUN9b7q5kqP//e2HcuABANBdsHfbX3/wWAzer1MiZtMfPDkeeF4O9ImBdT6fuX/5X1hIvbOM/uUhgXN4/cFTfptg0W07+5+fyBSq9Jv77Sv60XQBhhXHc6NpGT9rq7hbXcKPf6te5z7PniqrLVMj+Yb7YK3glxHU22L5j/3tJBoWCupTo30EAKgPn6//JATTctXZVObzxWP1RyFMOBP9dH/CO//53LsvOsT/z5UZeb4CAAAArUAmdr86JwcSpvtj9NkT/qCBHC0XA4fcCf/ra3MYDACgy+Hz+QeiP/qTOys03RenF0T/UvOqEF+4X/qBEGggpB4+PjHVv8nL8aGwNbay/3mZI2fa6R3VVAFmSCiOnzupk5f5SpMdSHHDuMlfODlaq42uX4sb7ebvd7fJIdOIdJPSsCsbAGBr3hcjD//3uxwPX3VFVXVucULebz01vuX7+Prw6knu8LrnP49K/FiMSHCHGC6hAAAA2gEPJPz7Nx/R5QnupMflaPkzosPOwsx/eG9GDtwBAHoDtiO5T/pJcQ7zICCHEQ6J+X8Sfct/urkEIfUQcmowKZ0qzCqt99eKcl7P/l8rVIRYl6V20lQB5t+y+6aXWdfFCjy2Akv/6epjajU8uv4mlyNU2+FLMY5KwKOyMznuc1PiZgwA2B4eefj3bz2kX0l3Pcc7r04OJujkULLue9gdMKliMrmy0l+Jju6b8HoBAADQZvgexiPjxbJrnLEB96sHqzDWAOhB+Hzmc7hYqdH91YIUXyCkHk54sHdIeeM/I0R2zVtSC6hv/7dDjwjTNAGGFcfhZFT69pgVUizjsbnu1w9W2zbq/av7q1SoOl7CHR03YRsbptcnYzYNJXeuKw8A8EcSM+JcttR59U0htJiqM8OhR6eHk/IcY680vlHC6wUAAEAnWROGGxtvEF4A6H34POZzGhxeJvvjqrKRRefG0t76gmgb7y+sb7L/OUytE/ZI0wSYz8lYWivg46Lrrlshzxc21n75oPU1tjW80zn5klfnWy9Zlgqh8LeSp6FQAmEAwNbwze7fvfWQ/vHmImUKFen293tGbL0OTeQL3H/84LEcZQQAAAAAAACAZjElBBitPrBHvumV/6t7q9JLStv/WdYj7nfGJmmKACO9X1IxGeajf5SPZXjCuBLH//dB+119rsyv033pjua420lGRSS5zTpEyRVsAAC7g3PD8LnN8xePDrkqtOBb58el6vx/vTujzkEAAAAAAAAAaB5T6Xgg3+znjAFhHjDmQWBt///y3lrHvPGbIsD83kn143RNJx3SQ6EyT8ThBysy2U0n+NGdJVcEMsKOrMA2u+vN7fvq2dEtc1oAAILwhYw9Yf7dmw8oFbFlzhcOAfzR7WWpOgMAAAAAAABAs0nFIp5Nz9Op4VTAjn9jJkMPMgUZjXOlzYl3TfYtwPCPGk7GvDLTerJDE5MplOkX9zsXfjC3UaJf3l/xS2KH5pbaRtNQnOpL0GkIMADsChZi7q0VpDfZPXi9AAAAAAAAAFoI56A09Qe27T93cjjwmr+7Nkf/57sz1En2LcA8M9kf8HYxSz27K0lHIdHffjRPneaNRxlaFSKLG3qkVlr+7G7IWGTx5ZlJlKYGAAAAAAAAAAC6kbQQYLz6y0p/ODOcok8fHfRew4PDnfbK37cAc2ZYeYcYYoZlusIo3phZo7n1EnUa3uk/5IS85vaSX6WJ81doznP2ZLFuJBXdVNUFAAAAAAAAAAAA3YGXbYT8VCi/d2qkq2z5fW0JVzfh8CNPwDCeM9etdjj0KMz1pZxMBuppRGo7OUTJDJe4MN7nHbjTgykCAAAAAAAAAABAd2EbeoT2hGFbPiXElz86N0Hdwr4EmOmBuJfE1vKqHZE3t9Qv/+XdNSp0WQLO719fkN4wcnt5O8X8X24tec+zuPTMVL939Kb6YwQAAAAAAAAAAIDuYjlfUQl4WYzRGoVbdOfCeJpOdUle130JMKeHXa8QW5WetkL/+Ne/N7dO73Uwy/BWrBYr9LuHGXdLxXa+/3g94P3yhTMj8jn+bTyNJiHAAAAAAAAAAAAA3UamVFG+E6744moUvk7xx+cnuiIUaV9bcKQ/vjnsiHzXn0yhQr+4v0LdyuuP1mhVbCNv58+M7RyOR+nZqQHpxqQZggADAAAAAAAAAAB0HWzXm9WNNTociVOnvHx0iDpNlPZBUihI7N3jOO6PdIzneP3P7q3IHdGtcAjS964+lsvmdn7+zIi74JAXojSS3NeuAgAAAAAAAAAAQAtYy5e9ZctIBmPqFV8Udv5HyxsdLQ60Lw8Y7cLjJbI1Mg6v5iv07lz3hR6FebxRkpNmuj9Bz00PBMtUh5cBAAAAAAAAAADQFdzlIjuWL7549rzjJujVy79/dow6yb4EmNFQBSRz+T9cmaFe5DuXJgO/w1aJfKC/AAAAAAAAAAAA3QfneOXqy/UqM5tVkc6MpOjl450LRWp6FhpOaPvTO8tdHXq0FV84PUIjqWCuF8dxCAAAAAAAAAAAAN3L9cWcnIedJ8J5Yb54aoSGU51JMbIvAcZWJZ78KkhEy8Uy/XYmQ73GcDJKXxIHQv8mM6Ewi0r5aneV0QYAAAAAAAAAAIDLh0sbnv3OeOWoWbMg385PxyL0J+cnqRPsS4BZLVTlnH1E3FAdi35+d4UKFV+s+NKZEfrM8c5nG96JL58e8UpVMfr32OpglSDAAAAAAAAAAAAAXcnd1QIVq45bDckQYeRjW6UWUSLM2eFUR3SKfQkwLLTIPCnq8WqxTO/M+ol3nz/ST186NSrFjU65+DQCb+dz04Pe40DiHsVctkgAAAAAAAAAAADoTl57tCrnm0pSq8wipo3v6hQxaif7EmBm14ver2LR4id3V7znOKTni6fG5PpkLELffGKcuhG9nebvYCzzsZiWezCnDQAAAAAAAAAAcFj4zYM1KlRrXkUky7DpdVJebfuzTvGnFyaonezTA6bqVQhaKQS9Xz57fIhG067XCz9/abKPzgwnqdtg1Ws0FQ1UOgooZWr943V4wAAAAAAAAAAAAN0KR+n85uFqcKVlVEOygtWbORTp4ngftYt9CTB3V/Pe8o9D3i+vnBh2H6g4K/61f3ZxUqhMTS+8tGfOiJ39/NFBrya4eSQcvd3iAStod1YLBAAAAAAAAAAAgO6FvWBWOILF87JQyXj1C0L2/59dmmibTrGvb2FRQqattXjZF2POjiRVchud0taRr+ESz5/VwkwX8GeXJpW3i+Ul47F4W8lcdujuSp4AAAAAAAAAAADQ3bAXzA9uLvq2vrTrfT0mbP+nolH61pNj1A72JcDkxQ+7I8SJx9kSreb9HCkvTA95yXlt9ZNtNb16fLjtiW7q8eUzozSa5O2wvAQ9tredFNjmDxY3CAAAAAAAAAAAAN3PNWHDvzWb9Wx7y3CzqGf/v3BkSIYjtZp9+9ncXs3L/C+aVNSmJ0ZSUl3ShZtNV5+EeP7PL3am5rZmJBmlr54ddXe62k7LCr5GP2T17EMIMAAAAAAAAAAAQM/wg5sLMhTJ9H7Zzv5vZcoU1iCYfX/6bx6s0q8frHmPj/QnPHeeiJFhWNfhjoj5WSHQtENd2or/5fljcu7XBif1WNUF932T6OpClgrlGgEAAAAAAAAAAKA34Iid/+Odh9KpgtnJ/h9Nx+grZ0apFXz1rBviZDkCAgAAAAAAAAAAAAAt4/8H9I2McHq5rpkAAAAASUVORK5CYII="
