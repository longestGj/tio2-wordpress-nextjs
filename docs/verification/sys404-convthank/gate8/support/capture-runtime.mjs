import {writeFileSync} from 'node:fs'

const baseUrl = process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:4381'
const output = process.argv[2] ?? 'docs/verification/sys404-convthank/gate8/runtime/runtime-contract.json'
const paths = [
  '/gate8-unmatched-root/?email=sentinel%40example.com#private',
  '/gate8/unmatched/nested/',
  '/gate8-unmatched-root/',
  '/products/',
  '/',
  '/request-documents/',
  '/contact/',
  '/request-a-quote/',
  '/thank-you/',
  '/thank-you/?request=quote',
  '/sitemap.xml',
]

const observations = []
for (const path of paths) {
  const response = await fetch(`${baseUrl}${path}`)
  const body = await response.text()
  observations.push({
    path,
    finalUrl: response.url,
    status: response.status,
    bytes: Buffer.byteLength(body),
    pageId: body.match(/data-page-id="([^"]+)"/)?.[1] ?? null,
    title: body.match(/<title>([^<]+)<\/title>/)?.[1] ?? null,
    robots: [...body.matchAll(/<meta name="robots" content="([^"]+)"/g)].map((match) => match[1]),
    canonical: body.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? null,
    containsReceipt: body.includes('REQUEST RECEIVED'),
    containsSentinel: body.includes('sentinel@example.com'),
    containsThankYouInSitemap: path === '/sitemap.xml' ? body.includes('/thank-you/') : null,
  })
}

writeFileSync(output, `${JSON.stringify({
  capturedAt: new Date().toISOString(),
  baseUrl,
  mode: 'read-only local production runtime; no external submission',
  observations,
}, null, 2)}\n`)
