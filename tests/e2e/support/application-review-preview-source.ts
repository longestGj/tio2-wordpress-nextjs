import {createHmac, timingSafeEqual} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {resolve} from 'node:path'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'
import {startOwnedNextDev} from './owned-next-dev'

const representatives = JSON.parse(
  readFileSync(
    resolve('tests/fixtures/editorial/site-a-applications.approved-representatives.json'),
    'utf8',
  ),
) as unknown
const manifest = validateSiteAApplicationManifest(representatives, {allowIncomplete: true})
const recordByPath = new Map(manifest.records.map((record) => [record.identity.path, record]))
const titleByTarget = new Map<string, string>([
  ['application:coatings', 'Titanium Dioxide for Coatings'],
  ['application:plastics', 'Titanium Dioxide for Plastics'],
  ['application:printing-inks', 'Titanium Dioxide for Printing Inks'],
  ['application:decorative-paper', 'Titanium Dioxide for Decorative Paper'],
  ['application:solar-film', 'Titanium Dioxide for Solar Film'],
  ['application:high-purity', 'High-Purity Titanium Dioxide'],
  ['application:universal-multi-application', 'Multi-Purpose Titanium Dioxide'],
  ['application:water-based-paint', 'Water-Based Paint'],
  ['application:electrophoretic-coating', 'Electrophoretic Coating'],
  ['application:high-pvc-flat-paint', 'High-PVC Flat Paint'],
  ['application:automotive-coatings', 'Automotive Coatings'],
  ['application:waterborne-automotive-coatings', 'Waterborne Automotive Coatings'],
  ['application:marine-aerospace-protective', 'Marine & Protective Coatings'],
  ['application:powder-coil-coatings', 'Powder & Coil Coatings'],
  ['resource:article-03', 'Why TiO₂ Content Alone Does Not Determine Performance'],
  ['resource:article-04', 'What Does Oil Absorption Mean in Titanium Dioxide?'],
  ['resource:article-06', 'How Surface Treatment Changes Titanium Dioxide Performance'],
  ['resource:article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
  ['resource:article-08', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint'],
  ['resource:article-10', 'How to Choose Titanium Dioxide for Outdoor Durability'],
])

function serializedLink(target: {readonly type: 'application' | 'product' | 'resource'; readonly id: string}) {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) throw new Error(`Unknown representative target: ${target.type}:${target.id}`)
  return {
    targetType: target.type,
    targetKey: target.id,
    title: titleByTarget.get(`${target.type}:${target.id}`) ?? target.id,
    path: canonical.path,
    href: null,
  }
}

function previewPayload(path: string) {
  const record = recordByPath.get(path)
  if (!record) return null
  const parent = record.identity.parentId
    ? serializedLink({type: 'application', id: record.identity.parentId})
    : null
  return {
    id: `application-review-${record.identity.id}`,
    databaseId: 700 + manifest.records.indexOf(record),
    siteId: 'tio2-a',
    path: record.identity.path,
    slug: record.identity.slug,
    title: record.identity.title,
    modifiedGmt: record.identity.modified,
    status: 'draft',
    applicationFields: {
      applicationId: record.identity.id,
      applicationLevel: record.identity.level,
      family: record.identity.family,
      parentApplication: parent,
      metaTitle: record.seo.title,
      metaDescription: record.seo.description,
      eyebrow: record.hero.eyebrow,
      headline: record.hero.headline,
      directAnswer: record.hero.directAnswer,
      applicationContext: record.decisionGuide.context,
      buyerProblem: record.decisionGuide.buyerProblem,
      selectionFactors: record.decisionGuide.selectionFactors,
      powderDataLimits: record.decisionGuide.powderDataLimits,
      validationPlan: record.decisionGuide.validationPlan,
      customerInputs: record.decisionGuide.customerInputs,
      bodySections: record.bodySections,
      startingProducts: record.startingProducts,
      faqItems: record.faqs,
      childApplications: record.children.map(serializedLink),
      relatedApplications: record.relationships.filter(({type}) => type === 'application').map(serializedLink),
      relatedResources: record.relationships.filter(({type}) => type === 'resource').map(serializedLink),
      relatedProducts: record.relationships.filter(({type}) => type === 'product').map(serializedLink),
      ctas: record.ctas,
      technicalDisclaimer: record.disclaimerHtml,
    },
  }
}

function signatureMatches(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual)) return false
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export interface ApplicationReviewRuntime {
  readonly baseUrl: string
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  signedPreviewUrl(canonicalPath: string): string
  stop(): Promise<void>
  url(path: string): string
}

export async function startApplicationReviewRuntime(): Promise<ApplicationReviewRuntime> {
  const previewSecret = 'application-review-preview-secret'
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
    const timestampValid = /^[1-9][0-9]{9}$/u.test(timestamp) && Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) <= 60
    const expected = createHmac('sha256', previewSecret).update(`${timestamp}\ntio2-a\n${path}`).digest('hex')
    if (siteId !== 'tio2-a' || !timestampValid || !signatureMatches(signature, expected)) {
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
  if (!address || typeof address === 'string') throw new Error('Application review source did not bind')
  const sourceUrl = `http://127.0.0.1:${address.port}/wp-json/tio2/v1/preview`
  const next = await startOwnedNextDev({
    environment: {
      PREVIEW_SECRET: previewSecret,
      SITE_ID: 'tio2-a',
      WORDPRESS_GRAPHQL_URL: `http://127.0.0.1:${address.port}/graphql`,
      WORDPRESS_PREVIEW_SECRET: previewSecret,
      WORDPRESS_PREVIEW_URL: sourceUrl,
    },
    runtimeId: 'application-review',
  })

  return {
    baseUrl: next.baseUrl,
    serverErrorsSince: next.serverErrorsSince,
    serverLogOffset: next.serverLogOffset,
    signedPreviewUrl(canonicalPath: string): string {
      if (!recordByPath.has(canonicalPath)) throw new Error('Unknown Application review path')
      const expires = Math.floor(Date.now() / 1000) + 300
      const signature = createHmac('sha256', previewSecret)
        .update(`${expires}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL('/api/preview', next.baseUrl)
      url.search = new URLSearchParams({expires: String(expires), path: canonicalPath, signature, siteId: 'tio2-a'}).toString()
      return url.href
    },
    async stop(): Promise<void> {
      await next.stop()
      await new Promise<void>((resolveClose, rejectClose) => source.close((error) => error ? rejectClose(error) : resolveClose()))
    },
    url: next.url,
  }
}
