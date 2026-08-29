import {createHmac, timingSafeEqual} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {createServer} from 'node:http'
import {resolve} from 'node:path'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {siteAProductRepresentativeFixtureSchema} from '@/lib/products/page-schema'
import {startOwnedNextDev} from './owned-next-dev'

export const PRODUCT_REVIEW_PREVIEW_SECRET =
  'site-a-product-review-preview-secret'

const APPROVED_PATHS = new Set([
  '/products',
  '/products/coatings',
  '/products/coatings/tp-c120',
])

const representativeFixture = siteAProductRepresentativeFixtureSchema.parse(
  JSON.parse(
    readFileSync(
      resolve(
        'tests/fixtures/products/site-a-products.approved-representatives.json',
      ),
      'utf8',
    ),
  ) as unknown,
)
const [productsHubPageInput, coatingsFamilyPageInput, tpC120ProductPageInput] =
  representativeFixture.records

const editorialTitles = new Map<string, string>([
  ['application:coatings', 'Titanium Dioxide for Coatings'],
  ['application:water-based-paint', 'Titanium Dioxide for Water-Based Paint'],
  ['resource:article-03', 'Why TiO₂ Content Alone Does Not Determine Performance'],
  ['resource:article-04', 'Oil Absorption in TiO₂'],
  ['resource:article-06', 'Surface Treatment'],
  ['resource:article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
  ['resource:article-08', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint'],
  ['resource:article-10', 'How to Choose Titanium Dioxide for Outdoor Durability'],
])

function collectionLink(
  target: {readonly type: string; readonly id: string},
  databaseId: number,
) {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) {
    throw new Error(`Missing Product review target ${target.type}:${target.id}`)
  }
  return {
    databaseId,
    path: canonical.path,
    title:
      editorialTitles.get(`${target.type}:${target.id}`) ?? canonical.path,
  }
}

function hubPayload() {
  const page = productsHubPageInput
  return {
    metaTitle: page.seo.title,
    metaDescription: page.seo.description,
    eyebrow: page.hero.eyebrow,
    headline: page.hero.headline,
    directAnswer: page.hero.directAnswer,
    heroImageId: 1101,
    decisionRail: page.decisionRail.map((item) => JSON.stringify(item)),
    familyCount: page.families.length,
    productCount: page.knownGrades.length,
    families: page.families.map((family, index) => ({
      slug: family.slug,
      name: family.title,
      path: `/products/${family.slug}`,
      headline: family.title,
      directAnswer: `<p>${family.summary}</p>`,
      heroImageId: 1200 + index,
      productCount: family.count,
    })),
    knownGradeHeading: page.presentation.knownGrade.heading,
    knownGradeHelp: page.presentation.knownGrade.help,
    decisionPath: JSON.stringify(page.decisionPath),
    applicationBoundary: JSON.stringify(page.applicationBoundary),
    resources: page.resources.map((target, index) =>
      collectionLink(target, 1300 + index),
    ),
    enquiry: JSON.stringify(page.enquiry),
    faqItems: page.faqs.map(({question, answerHtml}) => ({
      question,
      answer: answerHtml,
    })),
    technicalDisclaimer: page.disclaimerHtml,
  }
}

function familyPayload() {
  const page = coatingsFamilyPageInput
  return {
    slug: page.identity.slug,
    name: page.identity.title,
    metaTitle: page.seo.title,
    metaDescription: page.seo.description,
    eyebrow: page.hero.eyebrow,
    headline: page.hero.headline,
    directAnswer: page.hero.directAnswer,
    heroImageId: 2101,
    decisionRail: page.decisionRail.map((item) => JSON.stringify(item)),
    filters: page.filters,
    comparisonIntroduction: page.presentation.comparison.intro,
    comparisonCaption: page.comparison.caption,
    selectionMethod: JSON.stringify(page.selectionMethod),
    validationSteps: page.validationSteps.map((item) => JSON.stringify(item)),
    products: page.products.map((product, index) => ({
      databaseId: 2200 + index,
      productId: product.productId,
      slug: product.productSlug,
      title: product.productId,
      path: `/products/coatings/${product.productSlug}`,
      displayOrder: product.displayOrder,
      familyCardSummary: product.cardSummary,
      applicationFocus: product.applicationFocus,
      performanceFocus: product.performanceFocus,
      surfaceTreatmentPositioning: product.surfaceTreatmentPositioning,
      filterTags: product.filterTags,
    })),
    applications: page.applications.map((target, index) =>
      collectionLink(target, 2300 + index),
    ),
    resources: page.resources.map((target, index) =>
      collectionLink(target, 2400 + index),
    ),
    enquiry: JSON.stringify(page.enquiry),
    faqItems: page.faqs.map(({question, answerHtml}) => ({
      question,
      answer: answerHtml,
    })),
    technicalDisclaimer: page.disclaimerHtml,
  }
}

function previewLink(
  target: {readonly type: 'application' | 'resource' | 'product'; readonly id: string},
) {
  const canonical = target.type === 'product'
    ? SITE_A_PRODUCT_IDENTITIES.find(({id}) => id === target.id)
    : resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) {
    throw new Error(`Missing Product review target ${target.type}:${target.id}`)
  }
  return {
    title:
      target.type === 'product'
        ? target.id
        : editorialTitles.get(`${target.type}:${target.id}`) ?? target.id,
    href: canonical.path,
  }
}

function detailPayload() {
  const page = tpC120ProductPageInput
  const snapshot = Object.fromEntries(
    page.snapshot.map(({label, value}) => [label, value]),
  )
  return {
    id: 'product-review-tp-c120',
    databaseId: 3120,
    slug: page.identity.slug,
    title: page.identity.title,
    modifiedGmt: page.identity.modified,
    status: 'draft',
    productFields: {
      productId: page.identity.productId,
      family: 'Coatings',
      metaTitle: page.seo.title,
      metaDescription: page.seo.description,
      eyebrow: page.hero.eyebrow,
      customerProblemHeadline: page.hero.headline,
      quickAnswer: page.hero.directAnswer,
      productType: snapshot['Product type'],
      process: snapshot.Process,
      primaryApplication: snapshot['Primary application'],
      positioning: snapshot.Positioning,
      surfaceTreatment: snapshot['Surface treatment'],
      packaging: page.enquiryPreparation.packaging,
      tdsAccess: page.enquiryPreparation.tdsAccess,
      fitWhen: page.fitCheck.fitWhen.map((item) => ({item})),
      discussFirstWhen: page.fitCheck.discussFirstWhen.map((item) => ({item})),
      performancePriorities: page.formulationPriorities,
      recommendedApplications: [{
        ...previewLink(page.applicationContext.application),
        fit: page.applicationContext.description,
      }],
      evidenceStatement: page.technicalNote,
      typicalProperties: page.technicalProperties.map((property) => ({
        ...property,
        method: '',
        note: '',
      })),
      validationChecklist: page.validationSteps.map((item) => ({
        item: JSON.stringify(item),
      })),
      faqItems: page.faqs.map(({question, answerHtml}) => ({
        question,
        answer: answerHtml,
      })),
      relatedLinks: {
        applications: [],
        resources: page.relatedLinks.resources.map(previewLink),
        products: page.relatedLinks.products.map(previewLink),
      },
    },
    productSettingsFields: {
      inquiryFields: page.enquiryPreparation.items.map((item, index) => ({
        key: `item-${index + 1}`,
        label: item,
        guidance: item,
      })),
      requestTdsCta: {
        label: 'Request a TDS',
        description: 'Request by enquiry.',
      },
      discussApplicationCta: {
        label: 'Discuss Your Application',
        description: 'Discuss by enquiry.',
      },
      technicalDisclaimer: page.disclaimerHtml,
    },
  }
}

function envelope(path: string) {
  if (path === '/products') {
    return {level: 'hub', path, payload: hubPayload()}
  }
  if (path === '/products/coatings') {
    return {level: 'family', path, payload: familyPayload()}
  }
  if (path === '/products/coatings/tp-c120') {
    return {level: 'detail', path, payload: detailPayload()}
  }
  return null
}

function signatureMatches(actual: string, expected: string): boolean {
  if (!/^[a-f0-9]{64}$/u.test(actual)) return false
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'))
}

export interface ProductReviewPreviewSource {
  readonly url: string
  close(): Promise<void>
}

export interface ProductReviewRuntime {
  readonly baseUrl: string
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  signedPreviewUrl(canonicalPath: string): string
  stop(): Promise<void>
  url(path: string): string
}

export async function startProductReviewPreviewSource(): Promise<ProductReviewPreviewSource> {
  const server = createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://127.0.0.1')
    if (
      request.method !== 'GET' ||
      url.pathname !== '/wp-json/tio2/v1/preview'
    ) {
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
    const timestampValid =
      /^[1-9][0-9]{9}$/u.test(timestamp) &&
      Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp)) <= 60
    const expected = createHmac('sha256', PRODUCT_REVIEW_PREVIEW_SECRET)
      .update(`${timestamp}\ntio2-a\n${path}`)
      .digest('hex')
    if (
      url.searchParams.size !== 2 ||
      siteId !== 'tio2-a' ||
      !timestampValid ||
      !signatureMatches(signature, expected)
    ) {
      response.writeHead(401, {
        'cache-control': 'no-store',
        'content-type': 'application/json',
      })
      response.end(JSON.stringify({error: 'invalid preview request'}))
      return
    }
    const payload = envelope(path)
    if (!APPROVED_PATHS.has(path) || !payload) {
      response.writeHead(404, {'cache-control': 'no-store'}).end()
      return
    }
    response.writeHead(200, {
      'cache-control': 'no-store',
      'content-type': 'application/json',
    })
    response.end(JSON.stringify(payload))
  })

  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Product review preview source did not bind')
  }

  return {
    url: `http://127.0.0.1:${address.port}/wp-json/tio2/v1/preview`,
    async close(): Promise<void> {
      await new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => error ? rejectClose(error) : resolveClose())
      })
    },
  }
}

export async function startProductReviewRuntime(): Promise<ProductReviewRuntime> {
  const source = await startProductReviewPreviewSource()
  let next: Awaited<ReturnType<typeof startOwnedNextDev>> | undefined
  try {
    next = await startOwnedNextDev({
      environment: {
        PREVIEW_SECRET: PRODUCT_REVIEW_PREVIEW_SECRET,
        SITE_ID: 'tio2-a',
        WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:8080/graphql',
        WORDPRESS_PREVIEW_SECRET: PRODUCT_REVIEW_PREVIEW_SECRET,
        WORDPRESS_PREVIEW_URL: source.url,
      },
      runtimeId: 'product',
    })
  } catch (error) {
    await source.close()
    throw error
  }

  const runtime = next
  return {
    baseUrl: runtime.baseUrl,
    serverErrorsSince: runtime.serverErrorsSince,
    serverLogOffset: runtime.serverLogOffset,
    signedPreviewUrl(canonicalPath: string): string {
      if (!APPROVED_PATHS.has(canonicalPath)) {
        throw new Error('Unknown Product review path')
      }
      const expires = Math.floor(Date.now() / 1000) + 300
      const signature = createHmac('sha256', PRODUCT_REVIEW_PREVIEW_SECRET)
        .update(`${expires}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL('/api/preview', runtime.baseUrl)
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
        await runtime.stop()
      } finally {
        await source.close()
      }
    },
    url: runtime.url,
  }
}
