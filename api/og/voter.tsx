/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

const WHITE = '#ffffff'
const BG_FROM = '#8696FF'
const BG_TO = '#5BA8FA'
const ENS_LOGO_FILL = '#ffffff'

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

async function resolveAvatarUrl(name: string): Promise<string | null> {
  // Verify the avatar exists with a quick GET (metadata.ens.domains rejects HEAD),
  // then hand the URL to Satori so it fetches the image itself. We don't drain
  // the body — checking the headers is enough, and downloading twice would
  // bloat the function's total network time past Vercel's edge budget.
  try {
    const url = `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 2500)
    let res: Response
    try {
      res = await fetch(url, { signal: controller.signal, redirect: 'follow' })
    } finally {
      clearTimeout(timer)
    }
    // Cancel the body stream so we don't hold the connection open.
    res.body?.cancel().catch(() => undefined)
    if (!res.ok) return null
    const type = res.headers.get('content-type') ?? ''
    if (!type.startsWith('image/')) return null
    return url
  } catch {
    return null
  }
}

function initialsForAddress(addr: string): string {
  // Use the 4 hex chars after 0x as a deterministic "initials"
  return addr.slice(2, 4).toUpperCase()
}

export default async function handler(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawName = searchParams.get('name')?.trim()
  const rawAddress = searchParams.get('address')?.trim()

  const name = rawName && !isAddress(rawName) ? rawName : null
  const address = rawAddress && isAddress(rawAddress) ? rawAddress : (rawName && isAddress(rawName) ? rawName : null)

  const displayPrimary = name ?? (address ? truncateAddress(address) : 'ENS Delegate')
  const displaySecondary = name && address ? truncateAddress(address) : null
  const avatarUrl = name ? await resolveAvatarUrl(name) : null

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${BG_FROM} 0%, ${BG_TO} 100%)`,
          padding: 64,
        }}
      >
        {/* Top bar — ENS logo + Incentives Program wordmark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ filter: 'drop-shadow(0 2px 6px rgba(15, 23, 42, 0.22))' }}>
            <path
              d="M4.00058 9.70969C4.23776 10.2167 4.82477 11.2188 4.82477 11.2188L11.611 0L4.98783 4.62508C4.59318 4.88836 4.2694 5.24473 4.04505 5.66275C3.7434 6.29338 3.58313 6.98229 3.57545 7.68131C3.56777 8.38033 3.71286 9.07259 4.00058 9.70969Z"
              fill={ENS_LOGO_FILL}
            />
            <path
              d="M1.31159 13.4038C1.38637 14.477 1.68956 15.5217 2.20086 16.4682C2.71216 17.4146 3.41976 18.2409 4.27629 18.8917L11.6021 24C11.6021 24 7.01863 17.3944 3.15267 10.8215C2.76128 10.1271 2.49816 9.36782 2.37592 8.58011C2.3218 8.22341 2.3218 7.86059 2.37592 7.50389C2.27512 7.69068 2.07945 8.07313 2.07945 8.07313C1.68745 8.87262 1.42049 9.72754 1.28787 10.608C1.21154 11.5388 1.21948 12.4745 1.31159 13.4038Z"
              fill={ENS_LOGO_FILL}
            />
            <path
              d="M20.0011 14.2903C19.7639 13.7833 19.1769 12.7812 19.1769 12.7812L12.3907 24L19.0138 19.3779C19.4085 19.1146 19.7322 18.7582 19.9566 18.3402C20.2587 17.7092 20.4192 17.0198 20.4269 16.3202C20.4346 15.6206 20.2892 14.9278 20.0011 14.2903Z"
              fill={ENS_LOGO_FILL}
            />
            <path
              d="M22.69 10.5962C22.6153 9.52304 22.3121 8.47827 21.8008 7.53183C21.2895 6.58539 20.5819 5.75911 19.7253 5.10834L12.3996 0C12.3996 0 16.98 6.60556 20.849 13.1785C21.2393 13.8731 21.5014 14.6324 21.6227 15.4199C21.6769 15.7766 21.6769 16.1394 21.6227 16.4961C21.7235 16.3093 21.9192 15.9269 21.9192 15.9269C22.3112 15.1274 22.5782 14.2725 22.7108 13.392C22.7881 12.4613 22.7812 11.5256 22.69 10.5962Z"
              fill={ENS_LOGO_FILL}
            />
          </svg>
          <span style={{ fontSize: 32, fontWeight: 700, color: WHITE, letterSpacing: '-0.01em' }}>
            Incentives Program
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Body — avatar + identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 56 }}>
          {avatarUrl ? (
            <img
              src={avatarUrl}
              width={256}
              height={256}
              style={{
                borderRadius: 9999,
                border: `6px solid ${WHITE}`,
                boxShadow: '0 4px 24px rgba(15, 23, 42, 0.18)',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 256,
                height: 256,
                borderRadius: 9999,
                background: 'rgba(255, 255, 255, 0.22)',
                border: `6px solid ${WHITE}`,
                boxShadow: '0 4px 24px rgba(15, 23, 42, 0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                color: WHITE,
                fontSize: 96,
                fontWeight: 700,
              }}
            >
              {address ? initialsForAddress(address) : 'EN'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 720 }}>
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '6px 14px',
                background: 'rgba(255, 255, 255, 0.22)',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                color: WHITE,
                borderRadius: 9999,
                fontSize: 22,
                fontWeight: 700,
              }}
            >
              Active Delegate
            </div>
            <span
              style={{
                fontSize: 84,
                fontWeight: 700,
                color: WHITE,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                textShadow: '0 2px 12px rgba(15, 23, 42, 0.15)',
              }}
            >
              {displayPrimary}
            </span>
            {displaySecondary ? (
              <span
                style={{
                  fontSize: 26,
                  color: WHITE,
                  opacity: 0.75,
                  lineHeight: 1.2,
                }}
              >
                {displaySecondary}
              </span>
            ) : null}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer — call to action */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span style={{ fontSize: 30, fontWeight: 700, color: WHITE, letterSpacing: '-0.01em' }}>
            Delegate to {name ?? 'this voter'} →
          </span>
          <span style={{ fontSize: 22, color: WHITE, opacity: 0.85 }}>
            Earn APR rewards automatically — gas sponsored.
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'cache-control': 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  )
}
