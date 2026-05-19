/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

/* ─── Brand tokens (mirrors the Figma node 5376:998 design) ─── */

const WHITE = '#ffffff'
const BLUE = '#3889ff'
const BORDER_LIGHT = '#e8e8e8'

// Three-stop diagonal gradient from the Figma file — lavender → blue → sky.
// Angle in Figma is -17.7° (i.e. roughly bottom-right → top-left); CSS
// `linear-gradient(angle, ...)` uses the "to" direction so we flip the sign.
const BG_GRADIENT =
  'linear-gradient(162.3deg, rgb(160, 153, 255) -48.85%, rgb(114, 152, 248) 40.8%, rgb(68, 188, 240) 95.46%)'

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

/* ─── Satoshi font loading ─── */
// Cache the font promises at module scope so subsequent invocations on the
// same edge instance reuse them instead of re-fetching on every render.
type FontPromise = Promise<ArrayBuffer | null>
let satoshiBoldPromise: FontPromise | null = null
let satoshiMediumPromise: FontPromise | null = null

async function loadSatoshiWeight(weight: number): Promise<ArrayBuffer | null> {
  try {
    const cssRes = await fetch(
      `https://api.fontshare.com/v2/css?f[]=satoshi@${weight}&display=swap`,
      { headers: { 'user-agent': 'Mozilla/5.0' } },
    )
    if (!cssRes.ok) return null
    const css = await cssRes.text()
    // Fontshare CSS exposes the woff2 (and sometimes woff/ttf) URLs in url(...)
    // Prefer .ttf if available since Satori bundles its own woff2 decompressor
    // but TTF is the safest format.
    const ttfMatch = css.match(/url\((https:\/\/[^)]+\.ttf)\)/)
    const woff2Match = css.match(/url\((https:\/\/[^)]+\.woff2)\)/)
    const url = ttfMatch?.[1] ?? woff2Match?.[1]
    if (!url) return null
    const fontRes = await fetch(url)
    if (!fontRes.ok) return null
    return await fontRes.arrayBuffer()
  } catch {
    return null
  }
}

function getSatoshi(weight: 500 | 700): FontPromise {
  if (weight === 700) {
    if (!satoshiBoldPromise) satoshiBoldPromise = loadSatoshiWeight(700)
    return satoshiBoldPromise
  }
  if (!satoshiMediumPromise) satoshiMediumPromise = loadSatoshiWeight(500)
  return satoshiMediumPromise
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawName = searchParams.get('name')?.trim()
  const rawAddress = searchParams.get('address')?.trim()

  const name = rawName && !isAddress(rawName) ? rawName : null
  const address = rawAddress && isAddress(rawAddress)
    ? rawAddress
    : (rawName && isAddress(rawName) ? rawName : null)

  const displayName = name ?? (address ? truncateAddress(address) : 'ENS Delegate')
  const avatarUrl = name
    ? `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
    : null
  const initials = address ? initialsForAddress(address) : 'EN'

  // Kick off font fetches in parallel with avatar (Satori grabs it itself)
  const [satoshiBold, satoshiMedium] = await Promise.all([
    getSatoshi(700),
    getSatoshi(500),
  ])

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
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: BG_GRADIENT,
          padding: 60,
          fontFamily: fonts.length > 0 ? 'Satoshi, Inter, sans-serif' : 'Inter, sans-serif',
        }}
      >
        {/* Top — ENS logo + wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <svg
            width={46}
            height={52}
            viewBox="0 0 24 24"
            fill="none"
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0, 0, 0, 0.18))' }}
          >
            <path
              d="M4.00058 9.70969C4.23776 10.2167 4.82477 11.2188 4.82477 11.2188L11.611 0L4.98783 4.62508C4.59318 4.88836 4.2694 5.24473 4.04505 5.66275C3.7434 6.29338 3.58313 6.98229 3.57545 7.68131C3.56777 8.38033 3.71286 9.07259 4.00058 9.70969Z"
              fill={WHITE}
            />
            <path
              d="M1.31159 13.4038C1.38637 14.477 1.68956 15.5217 2.20086 16.4682C2.71216 17.4146 3.41976 18.2409 4.27629 18.8917L11.6021 24C11.6021 24 7.01863 17.3944 3.15267 10.8215C2.76128 10.1271 2.49816 9.36782 2.37592 8.58011C2.3218 8.22341 2.3218 7.86059 2.37592 7.50389C2.27512 7.69068 2.07945 8.07313 2.07945 8.07313C1.68745 8.87262 1.42049 9.72754 1.28787 10.608C1.21154 11.5388 1.21948 12.4745 1.31159 13.4038Z"
              fill={WHITE}
            />
            <path
              d="M20.0011 14.2903C19.7639 13.7833 19.1769 12.7812 19.1769 12.7812L12.3907 24L19.0138 19.3779C19.4085 19.1146 19.7322 18.7582 19.9566 18.3402C20.2587 17.7092 20.4192 17.0198 20.4269 16.3202C20.4346 15.6206 20.2892 14.9278 20.0011 14.2903Z"
              fill={WHITE}
            />
            <path
              d="M22.69 10.5962C22.6153 9.52304 22.3121 8.47827 21.8008 7.53183C21.2895 6.58539 20.5819 5.75911 19.7253 5.10834L12.3996 0C12.3996 0 16.98 6.60556 20.849 13.1785C21.2393 13.8731 21.5014 14.6324 21.6227 15.4199C21.6769 15.7766 21.6769 16.1394 21.6227 16.4961C21.7235 16.3093 21.9192 15.9269 21.9192 15.9269C22.3112 15.1274 22.5782 14.2725 22.7108 13.392C22.7881 12.4613 22.7812 11.5256 22.69 10.5962Z"
              fill={WHITE}
            />
          </svg>
          <span
            style={{
              fontSize: 40,
              fontWeight: 700,
              color: WHITE,
              lineHeight: 1.2,
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
            }}
          >
            ENS Incentives Program
          </span>
        </div>

        {/* Middle — avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 40, width: '100%' }}>
          <div
            style={{
              position: 'relative',
              display: 'flex',
              width: 180,
              height: 180,
              borderRadius: 9999,
              border: `4px solid ${WHITE}`,
              boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
              overflow: 'hidden',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255, 255, 255, 0.18)',
              color: WHITE,
              fontSize: 64,
              fontWeight: 700,
            }}
          >
            {/* Initials fallback sits behind; if avatar loads, it covers the slot */}
            <span style={{ position: 'absolute' }}>{initials}</span>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                width={180}
                height={180}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : null}
          </div>

          <div
            style={{
              display: 'flex',
              flex: '1 0 0',
              flexDirection: 'column',
              gap: 12,
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.12)',
                border: '2px solid rgba(255, 255, 255, 0.5)',
                color: WHITE,
                borderRadius: 100,
                fontSize: 28,
                fontWeight: 500,
                lineHeight: 1.2,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
              }}
            >
              Active voter profile
            </div>
            <span
              style={{
                fontSize: 88,
                fontWeight: 700,
                color: WHITE,
                lineHeight: 1.2,
                textShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
                wordBreak: 'break-word',
              }}
            >
              {displayName}
            </span>
          </div>
        </div>

        {/* Bottom — CTA card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 20,
            width: '100%',
            height: 99,
            padding: 32,
            background: WHITE,
            border: `1px solid ${BORDER_LIGHT}`,
            borderRadius: 24,
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
          }}
        >
          <span
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: BLUE,
              lineHeight: 1.1,
            }}
          >
            Delegate for free and earn your reward
          </span>
          <svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke={BLUE}
              strokeWidth={2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    ),
    responseOptions,
  )
}
