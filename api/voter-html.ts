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

export default async function handler(request: Request) {
  const url = new URL(request.url)
  const rawParam = url.searchParams.get('address')?.trim() ?? ''
  if (!rawParam) {
    // No address given; fall back to default index.html
    return fetch(`${url.origin}/index.html`, { redirect: 'manual' })
  }

  const looksLikeAddress = isAddress(rawParam)
  const name = looksLikeAddress ? null : rawParam
  const address = looksLikeAddress ? rawParam : null
  const displayName = name ?? (address ? truncateAddress(address) : 'ENS Delegate')

  // Build the OG image URL. The param set + order MUST match the in-app preview
  // (buildVoterOgImageUrl in features/delegate/utils/shareCard.ts) so the modal
  // preview <img> and this crawler og:image resolve to the SAME Vercel CDN
  // cache key. Otherwise opening the share modal warms a different entry than
  // the one X actually fetches, and the card renders cold (slow) on the first
  // share. holder-html.ts already sets `variant`; voter-html was missing it.
  const ogQuery = new URLSearchParams()
  ogQuery.set('variant', 'delegate')
  if (name) ogQuery.set('name', name)
  else if (address) ogQuery.set('address', address)
  const ogImageUrl = `${url.origin}/api/og/voter?${ogQuery.toString()}`

  const pageTitle = `${displayName} · ENS Delegate`
  const pageDescription = `${displayName}'s ENS governance record on the Delegation Incentives Program.`
  const pageUrl = `${url.origin}/voters/${encodeURIComponent(rawParam)}`

  // Fetch the static index.html. We use the same origin so Vercel serves the build artifact.
  const indexRes = await fetch(`${url.origin}/index.html`, { redirect: 'manual' })
  if (!indexRes.ok) {
    return new Response('index.html unavailable', { status: 500 })
  }
  let html = await indexRes.text()

  // Strip the static meta tags that index.html ships with so our per-delegate
  // tags are the only ones crawlers see. Otherwise the generic og:image card
  // could win depending on the crawler's "first vs last" preference.
  html = html.replace(/<title>[\s\S]*?<\/title>/i, '')
  html = html.replace(/<meta\s+name="description"[^>]*>/gi, '')
  html = html.replace(/<meta\s+property="og:[^"]*"[^>]*>/gi, '')
  html = html.replace(/<meta\s+name="twitter:[^"]*"[^>]*>/gi, '')

  const metaBlock = `
    <title>${escapeHtml(pageTitle)}</title>
    <meta name="description" content="${escapeHtml(pageDescription)}" />
    <meta property="og:type" content="profile" />
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
