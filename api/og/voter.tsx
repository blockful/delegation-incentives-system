/** @jsxRuntime automatic */
/** @jsxImportSource react */
import { ImageResponse } from '@vercel/og'

export const config = {
  runtime: 'edge',
}

const BLUE = '#3889ff'
const DARK = '#1e2122'
const MUTED = '#5d5c62'
const BG_TOP = '#EBF3FF'
const BG_BOT = '#ffffff'
const POSITIVE_BG = '#e7f4ef'
const POSITIVE_FG = '#199c75'

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

async function resolveAvatarUrl(name: string): Promise<string | null> {
  // Verify the avatar exists before handing the URL to Satori (which would otherwise crash on 404).
  // We pass the HTTPS URL directly to <img> so Satori fetches it itself — avoids data: URLs
  // which the local Edge runtime emulator can't fetch (works fine in production either way).
  try {
    const url = `https://metadata.ens.domains/mainnet/avatar/${encodeURIComponent(name)}`
    const res = await fetch(url, { method: 'HEAD' })
    if (!res.ok) return null
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
          background: `linear-gradient(180deg, ${BG_TOP} 0%, ${BG_BOT} 100%)`,
          padding: 64,
        }}
      >
        {/* Top bar — brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: BLUE,
            }}
          />
          <span style={{ fontSize: 26, fontWeight: 700, color: BLUE }}>ENS Incentives</span>
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
                border: `6px solid #ffffff`,
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                width: 256,
                height: 256,
                borderRadius: 9999,
                background: BLUE,
                border: `6px solid #ffffff`,
                boxShadow: '0 2px 12px rgba(15, 23, 42, 0.08)',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#ffffff',
                fontSize: 96,
                fontWeight: 700,
              }}
            >
              {address ? initialsForAddress(address) : 'EN'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 760 }}>
            <span
              style={{
                fontSize: 76,
                fontWeight: 700,
                color: DARK,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
              }}
            >
              {displayPrimary}
            </span>
            {displaySecondary ? (
              <span style={{ fontSize: 30, color: MUTED, lineHeight: 1.2 }}>{displaySecondary}</span>
            ) : null}
            <div
              style={{
                display: 'flex',
                alignSelf: 'flex-start',
                padding: '8px 18px',
                background: POSITIVE_BG,
                color: POSITIVE_FG,
                borderRadius: 9999,
                fontSize: 24,
                fontWeight: 700,
                marginTop: 4,
              }}
            >
              ENS Delegate
            </div>
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 24, color: MUTED }}>
            Delegate your ENS · Earn APR rewards automatically
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
