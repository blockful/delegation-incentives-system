/* Quick local exerciser for the Vercel OG functions.
   Calls each handler with a synthetic Request and writes the output to disk.

   Run with: pnpm --filter @ens-dis/frontend tsx scripts/test-og.mts */

import { writeFile, mkdir } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = resolve(__dirname, '..', '.og-test')

// Sample inputs to exercise both shapes
const CASES: Array<{ slug: string; query: string }> = [
  { slug: 'vitalik-by-name', query: 'name=vitalik.eth' },
  { slug: 'vitalik-by-addr', query: 'address=0xd8da6bf26964af9d7eed9e03e53415d37aa96045' },
  { slug: 'no-ens-addr', query: 'address=0x0000000000000000000000000000000000000001' },
]

async function ensureOutDir() {
  await mkdir(OUT_DIR, { recursive: true })
}

async function testOgImage() {
  const { default: handler } = await import('../api/og/voter.tsx')
  for (const { slug, query } of CASES) {
    const req = new Request(`http://localhost:3000/api/og/voter?${query}`)
    const res = await handler(req)
    if (!res.ok) {
      console.error(`OG ${slug}: ${res.status} ${res.statusText}`)
      continue
    }
    const buf = Buffer.from(await res.arrayBuffer())
    const path = resolve(OUT_DIR, `og-${slug}.png`)
    await writeFile(path, buf)
    console.log(`✔ OG image written: ${path} (${buf.length} bytes)`)
  }
}

// Mock the index.html that voter-html fetches so we don't need a running server
const STUB_INDEX_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>ENS Delegation Incentives</title>
  </head>
  <body><div id="root"></div></body>
</html>`

async function testVoterHtml() {
  const originalFetch = globalThis.fetch
  globalThis.fetch = (async (input: Request | string | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    if (url.endsWith('/index.html')) {
      return new Response(STUB_INDEX_HTML, {
        status: 200,
        headers: { 'content-type': 'text/html; charset=utf-8' },
      })
    }
    return originalFetch(input as any, init)
  }) as typeof fetch

  try {
    const { default: handler } = await import('../api/voter-html.ts')
    for (const { slug, query } of CASES) {
      const address = new URLSearchParams(query).get('address') ?? new URLSearchParams(query).get('name')!
      const req = new Request(`http://localhost:3000/api/voter-html?address=${encodeURIComponent(address)}`)
      const res = await handler(req)
      const html = await res.text()
      const path = resolve(OUT_DIR, `html-${slug}.html`)
      await writeFile(path, html, 'utf-8')
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/)
      const titleMatch = html.match(/<title>([^<]+)<\/title>/)
      console.log(`✔ HTML for ${slug}: ${path}`)
      console.log(`    title:    ${titleMatch?.[1] ?? '(none)'}`)
      console.log(`    og:image: ${ogImageMatch?.[1] ?? '(missing!)'}`)
    }
  } finally {
    globalThis.fetch = originalFetch
  }
}

await ensureOutDir()
console.log('--- OG image function ---')
await testOgImage()
console.log('\n--- voter-html meta injection ---')
await testVoterHtml()
console.log(`\nDone. Outputs in: ${OUT_DIR}`)
