export const config = {
  runtime: 'edge',
}

function isAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value)
}

function truncateAddress(addr: string): string {
  if (addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Crawler-facing shell for a holder's post-delegation share link
// (/share/holder/:address). Injects the holder card OG tags so the link
// unfurls into the "I just delegated my ENS!" card on X. Humans who open the
// link are redirected to the landing page by the SPA route — a holder isn't
// necessarily a delegate, so there's no profile page to show.
export default async function handler(request: Request) {
  const url = new URL(request.url)
  const rawParam = url.searchParams.get('address')?.trim() ?? ''
  if (!rawParam) {
    // No address given; fall back to the default index.html.
    return fetch(`${url.origin}/index.html`, { redirect: 'manual' })
  }

  const looksLikeAddress = isAddress(rawParam)
  const name = looksLikeAddress ? null : rawParam
  const address = looksLikeAddress ? rawParam : null
  const displayName = name ?? (address ? truncateAddress(address) : 'An ENS holder')

  // Must match buildVoterOgImageUrl({ variant: 'holder' }) param order exactly,
  // so the in-app preview and the crawler hit the same cached image.
  const ogQuery = new URLSearchParams()
  ogQuery.set('variant', 'holder')
  if (name) ogQuery.set('name', name)
  else if (address) ogQuery.set('address', address)
  const ogImageUrl = `${url.origin}/api/og/voter?${ogQuery.toString()}`

  const pageTitle = `${displayName} just delegated their ENS`
  const pageDescription = `Join ${displayName} on the ENS Delegation Incentives Program. Delegate your ENS, keep governance active, and earn rewards from the DAO.`
  const pageUrl = `${url.origin}/share/holder/${encodeURIComponent(rawParam)}`

  const indexRes = await fetch(`${url.origin}/index.html`, { redirect: 'manual' })
  if (!indexRes.ok) {
    return new Response('index.html unavailable', { status: 500 })
  }
  let html = await indexRes.text()

  // Strip the static meta tags so our per-holder tags are the only ones crawlers see.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '')
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '')
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')

  const metaBlock = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${escapeHtml(pageTitle)}" />
    <meta property="og:description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:url" content="${escapeHtml(pageUrl)}" />
    <meta property="og:image" content="${escapeHtml(ogImageUrl)}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
    <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />
    <meta name="twitter:image" content="${escapeHtml(ogImageUrl)}" />
  `

  html = html.replace('</head>', `${metaBlock}\n  </head>`)

  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
    },
  })
}
