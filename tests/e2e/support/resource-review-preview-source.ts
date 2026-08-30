import {createHmac, timingSafeEqual} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {resolve} from 'node:path'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {validateSiteAResourceManifest} from '@/lib/resources/content-manifest'
import {startOwnedNextDev} from './owned-next-dev'

const previewSecret = 'resource-review-preview-secret'
const manifest = validateSiteAResourceManifest(
  JSON.parse(
    readFileSync(
      resolve('tests/fixtures/editorial/site-a-resources.approved.json'),
      'utf8',
    ),
  ) as unknown,
)
const applicationRepresentatives = validateSiteAApplicationManifest(
  JSON.parse(
    readFileSync(
      resolve('tests/fixtures/editorial/site-a-applications.approved-representatives.json'),
      'utf8',
    ),
  ) as unknown,
  {allowIncomplete: true},
)
const recordByPath = new Map(
  manifest.records.map((record) => [record.identity.path, record]),
)
const titleByTarget = new Map<string, string>([
  ...manifest.records.map((record) => [
    `resource:${record.identity.id}`,
    record.identity.title,
  ] as const),
  ...applicationRepresentatives.records.map((record) => [
    `application:${record.identity.id}`,
    record.identity.title,
  ] as const),
  // These values are the frozen, approved Application review title mapping.
  ['application:printing-inks', 'Titanium Dioxide for Printing Inks'],
  ['application:high-pvc-flat-paint', 'High-PVC Flat Paint'],
  ...SITE_A_PRODUCT_IDENTITIES
    .filter(({level}) => level === 'detail')
    .map(({id}) => [`product:${id}`, id] as const),
])

function serializedLink(target: {
  readonly type: 'application' | 'product' | 'resource'
  readonly id: string
}) {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) {
    throw new Error(`Unknown Resource review target: ${target.type}:${target.id}`)
  }
  const title = titleByTarget.get(`${target.type}:${target.id}`)
  if (!title) {
    throw new Error(`Missing approved Resource review title: ${target.type}:${target.id}`)
  }
  return {
    targetType: target.type,
    targetKey: target.id,
    title,
    path: canonical.path,
    href: null,
  }
}

function previewPayload(path: string) {
  const record = recordByPath.get(path)
  if (!record) return null
  return {
    id: `resource-review-${record.identity.id}`,
    databaseId: 800 + manifest.records.indexOf(record),
    siteId: 'tio2-a',
    path: record.identity.path,
    slug: record.identity.slug,
    title: record.identity.title,
    modifiedGmt: record.identity.modified,
    status: 'draft',
    resourceFields: {
      resourceId: record.identity.id,
      resourceKind: record.identity.kind,
      cluster: record.identity.cluster,
      metaTitle: record.seo.title,
      metaDescription: record.seo.description,
      eyebrow: record.hero.eyebrow,
      headline: record.hero.headline,
      directAnswer: record.hero.directAnswer,
      keyTakeaways: record.keyTakeaways,
      sections: record.sections,
      comparisonTable: record.comparisonTable
        ? {
            columns: record.comparisonTable.columns,
            rows: record.comparisonTable.rows.map((cells) => ({cells})),
          }
        : null,
      practicalImplications: record.practicalImplications,
      commonMistakes: record.commonMistakes,
      evaluationMethod: record.evaluationMethod,
      faqItems: record.faqs,
      childResources: record.children.map(serializedLink),
      relatedApplications: record.relationships
        .filter(({type}) => type === 'application')
        .map(serializedLink),
      relatedResources: record.relationships
        .filter(({type}) => type === 'resource')
        .map(serializedLink),
      relatedProducts: record.relationships
        .filter(({type}) => type === 'product')
        .map(serializedLink),
      ctas: record.ctas,
      technicalDisclaimer: record.disclaimerHtml,
    },
  }
}

function signatureMatches(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual)) return false
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export interface ResourceReviewRuntime {
  readonly baseUrl: string
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  signedPreviewUrl(canonicalPath: string): string
  stop(): Promise<void>
  url(path: string): string
}

export async function startResourceReviewRuntime(): Promise<ResourceReviewRuntime> {
  const source = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (request.method !== 'GET' || url.pathname !== '/wp-json/tio2/v1/preview') {
      response.writeHead(404, {'cache-control': 'no-store'}).end()
      return
    }
    const siteId = url.searchParams.get('siteId') ?? ''
    const path = url.searchParams.get('path') ?? ''
    const timestamp = typeof request.headers['x-tio2-preview-timestamp'] === 'string'
      ? request.headers['x-tio2-preview-timestamp']
      : ''
    const signature = typeof request.headers['x-tio2-preview-signature'] === 'string'
      ? request.headers['x-tio2-preview-signature']
      : ''
    const timestampValid = /^[1-9][0-9]{9}$/u.test(timestamp) &&
      Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) <= 60
    const expected = createHmac('sha256', previewSecret)
      .update(`${timestamp}\ntio2-a\n${path}`)
      .digest('hex')
    if (url.searchParams.size !== 2 || siteId !== 'tio2-a' || !timestampValid || !signatureMatches(signature, expected)) {
      response.writeHead(401, {'cache-control': 'no-store', 'content-type': 'application/json'})
      response.end(JSON.stringify({error: 'invalid preview request'}))
      return
    }
    const payload = previewPayload(path)
    if (!payload) {
      response.writeHead(404, {'cache-control': 'no-store'}).end()
      return
    }
    response.writeHead(200, {'cache-control': 'no-store', 'content-type': 'application/json'})
    response.end(JSON.stringify(payload))
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    source.once('error', rejectListen)
    source.listen(0, '127.0.0.1', resolveListen)
  })
  const address = source.address()
  if (!address || typeof address === 'string') {
    await new Promise<void>((resolveClose, rejectClose) => source.close((error) => error ? rejectClose(error) : resolveClose()))
    throw new Error('Resource review preview source did not bind')
  }
  const sourceUrl = `http://127.0.0.1:${address.port}/wp-json/tio2/v1/preview`
  let next: Awaited<ReturnType<typeof startOwnedNextDev>>
  try {
    next = await startOwnedNextDev({
      environment: {
        PREVIEW_SECRET: previewSecret,
        SITE_ID: 'tio2-a',
        WORDPRESS_GRAPHQL_URL: `http://127.0.0.1:${address.port}/graphql`,
        WORDPRESS_PREVIEW_SECRET: previewSecret,
        WORDPRESS_PREVIEW_URL: sourceUrl,
      },
      runtimeId: 'resource-review',
    })
  } catch (error) {
    await new Promise<void>((resolveClose, rejectClose) => source.close((closeError) => closeError ? rejectClose(closeError) : resolveClose()))
    throw error
  }

  return {
    baseUrl: next.baseUrl,
    serverErrorsSince: next.serverErrorsSince,
    serverLogOffset: next.serverLogOffset,
    signedPreviewUrl(canonicalPath: string): string {
      if (!recordByPath.has(canonicalPath)) throw new Error('Unknown Resource review path')
      const expires = Math.floor(Date.now() / 1000) + 300
      const signature = createHmac('sha256', previewSecret)
        .update(`${expires}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL('/api/preview', next.baseUrl)
      url.search = new URLSearchParams({
        expires: String(expires),
        path: canonicalPath,
        signature,
        siteId: 'tio2-a',
      }).toString()
      return url.href
    },
    async stop(): Promise<void> {
      try {
        await next.stop()
      } finally {
        await new Promise<void>((resolveClose, rejectClose) => source.close((error) => error ? rejectClose(error) : resolveClose()))
      }
    },
    url: next.url,
  }
}
