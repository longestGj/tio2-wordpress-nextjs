import {createHmac} from 'node:crypto'

import {delay, http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {
  isValidatedProductExperiencePage,
  ProductPageContractError,
} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {getProductPagePreview} from '@/lib/wordpress/product-page-preview'
import {PreviewTransportError} from '@/lib/wordpress/preview'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'
import {getSiteConfig} from '@/sites'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'
import {server} from '@/tests/mocks/server'

const previewEndpoint = 'http://wordpress.test/wp-json/tio2/v1/preview'

function collectionLink(target: {type: string; id: string}, databaseId: number) {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) throw new Error(`Missing canonical target ${target.type}:${target.id}`)
  return {databaseId, title: `Editorial ${target.id}`, path: canonical.path}
}

function hubPayload() {
  const page = productsHubPageInput
  return {
    metaTitle: page.seo.title,
    metaDescription: page.seo.description,
    eyebrow: page.hero.eyebrow,
    headline: page.hero.headline,
    directAnswer: page.hero.directAnswer,
    heroImageId: 101,
    decisionRail: page.decisionRail.map((item) => JSON.stringify(item)),
    familyCount: 8,
    productCount: 25,
    families: page.families.map((family) => ({
      slug: family.slug,
      name: family.title,
      path: `/products/${family.slug}`,
      headline: family.title,
      directAnswer: `<p>${family.summary}</p>`,
      heroImageId: 102,
      productCount: family.count,
    })),
    knownGradeHeading: 'Known grades',
    knownGradeHelp: 'Search the complete grade inventory.',
    decisionPath: JSON.stringify(page.decisionPath),
    applicationBoundary: JSON.stringify(page.applicationBoundary),
    resources: page.resources.map((target, index) => collectionLink(target, 200 + index)),
    enquiry: JSON.stringify(page.enquiry),
    faqItems: page.faqs.map(({question, answerHtml}) => ({question, answer: answerHtml})),
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
    heroImageId: 103,
    decisionRail: page.decisionRail.map((item) => JSON.stringify(item)),
    filters: page.filters,
    comparisonIntroduction: 'Compare every candidate under matched conditions.',
    comparisonCaption: page.comparison.caption,
    selectionMethod: JSON.stringify(page.selectionMethod),
    validationSteps: page.validationSteps.map((item) => JSON.stringify(item)),
    products: page.products.map((product, index) => ({
      databaseId: 300 + index,
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
    applications: page.applications.map((target, index) => collectionLink(target, 400 + index)),
    resources: page.resources.map((target, index) => collectionLink(target, 500 + index)),
    enquiry: JSON.stringify(page.enquiry),
    faqItems: page.faqs.map(({question, answerHtml}) => ({question, answer: answerHtml})),
    technicalDisclaimer: page.disclaimerHtml,
  }
}

function previewLink(target: {type: 'application' | 'resource' | 'product'; id: string}) {
  const canonical = target.type === 'product'
    ? SITE_A_PRODUCT_IDENTITIES.find(({id}) => id === target.id)
    : resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) throw new Error(`Missing target ${target.type}:${target.id}`)
  return {title: `Editorial ${target.id}`, href: canonical.path}
}

function detailPayload() {
  const page = tpC120ProductPageInput
  const snapshot = Object.fromEntries(page.snapshot.map(({label, value}) => [label, value]))
  return {
    id: 'product-tp-c120',
    databaseId: 120,
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
        title: `Editorial ${page.applicationContext.application.id}`,
        fit: page.applicationContext.description,
        href: resolveCanonicalEditorialTarget('application', page.applicationContext.application.id)?.path,
      }],
      evidenceStatement: page.technicalNote,
      typicalProperties: page.technicalProperties.map((property) => ({
        ...property,
        method: '',
        note: '',
      })),
      validationChecklist: page.validationSteps.map((item) => ({item: JSON.stringify(item)})),
      faqItems: page.faqs.map(({question, answerHtml}) => ({question, answer: answerHtml})),
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
      requestTdsCta: {label: 'Request a TDS', description: 'Request by enquiry.'},
      discussApplicationCta: {label: 'Discuss Your Application', description: 'Discuss by enquiry.'},
      technicalDisclaimer: page.disclaimerHtml,
    },
  }
}

function envelope(path: string) {
  if (path === '/products') return {level: 'hub', path, payload: hubPayload()}
  if (path === '/products/coatings') return {level: 'family', path, payload: familyPayload()}
  return {level: 'detail', path, payload: detailPayload()}
}

beforeEach(() => {
  process.env.WORDPRESS_PREVIEW_URL = previewEndpoint
  process.env.WORDPRESS_PREVIEW_SECRET = 'product-page-preview-secret'
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('getProductPagePreview', () => {
  it.each([
    ['/products', 'hub'],
    ['/products/coatings', 'family'],
    ['/products/coatings/tp-c120', 'detail'],
  ] as const)('signs an exact no-store %s preview and returns a validated DTO', async (path, level) => {
    const now = new Date('2026-08-29T12:00:00.000Z')
    vi.setSystemTime(now)
    let observedInit: RequestInit | undefined
    server.use(http.get(previewEndpoint, ({request}) => {
      const url = new URL(request.url)
      expect(url.searchParams.get('siteId')).toBe('tio2-a')
      expect(url.searchParams.get('path')).toBe(path)
      const timestamp = request.headers.get('x-tio2-preview-timestamp')
      expect(timestamp).toBe(String(Math.floor(now.getTime() / 1000)))
      expect(request.headers.get('x-tio2-preview-signature')).toBe(
        createHmac('sha256', 'product-page-preview-secret')
          .update(`${timestamp}\ntio2-a\n${path}`)
          .digest('hex'),
      )
      return HttpResponse.json(envelope(path))
    }))
    const nativeFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => {
      observedInit = init
      return nativeFetch(input, init)
    }
    try {
      const result = await getProductPagePreview(getSiteConfig('tio2-a'), path)
      expect(result.level).toBe(level)
      expect(result.identity.path).toBe(path)
      expect(isValidatedProductExperiencePage(result)).toBe(true)
    } finally {
      globalThis.fetch = nativeFetch
      vi.useRealTimers()
    }
    expect(observedInit?.cache).toBe('no-store')
    expect(observedInit).not.toHaveProperty('next')
  })

  it('rejects a malformed or cross-level envelope before normalization', async () => {
    server.use(http.get(previewEndpoint, () => HttpResponse.json({
      ...envelope('/products'),
      level: 'family',
      unexpected: 'not allowlisted',
    })))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toBeInstanceOf(PreviewTransportError)
  })

  it('rejects a path-mismatched response envelope', async () => {
    server.use(http.get(previewEndpoint, () => HttpResponse.json({
      ...envelope('/products'),
      path: '/products/coatings',
    })))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toBeInstanceOf(InvalidContentPathError)
  })

  it('rejects a Detail payload assigned to the wrong Family', async () => {
    const response = {
      level: 'detail' as const,
      path: '/products/coatings/tp-c120',
      payload: detailPayload(),
    }
    response.payload.productFields.family = 'Plastics & Masterbatch'
    server.use(http.get(previewEndpoint, () => HttpResponse.json(response)))
    await expect(
      getProductPagePreview(
        getSiteConfig('tio2-a'),
        '/products/coatings/tp-c120',
      ),
    ).rejects.toBeInstanceOf(ProductPageContractError)
  })

  it('fails closed when WordPress rejects a stale signature', async () => {
    server.use(http.get(previewEndpoint, () => HttpResponse.json(
      {code: 'tio2_preview_unauthorized'},
      {status: 401},
    )))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({name: PreviewTransportError.name, status: 401})
  })

  it('aborts a timed-out preview as a typed transport error without stale fallback', async () => {
    let available = true
    server.use(http.get(previewEndpoint, async () => {
      if (available) return HttpResponse.json(envelope('/products'))
      await delay('infinite')
      return HttpResponse.json(envelope('/products'))
    }))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).resolves.toMatchObject({level: 'hub'})
    available = false

    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
    const timeoutSpy = vi
      .spyOn(AbortSignal, 'timeout')
      .mockImplementation(() => nativeTimeout(20))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({
      name: PreviewTransportError.name,
      message: 'WordPress Product page preview timed out after 8000ms',
    })
    expect(timeoutSpy).toHaveBeenCalledWith(8_000)
  })

  it('wraps a preview network rejection as a typed transport error', async () => {
    server.use(http.get(previewEndpoint, () => HttpResponse.error()))

    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({
      name: PreviewTransportError.name,
      message: 'WordPress Product page preview network request failed',
    })
  })

  it('rejects Site B and noncanonical paths before issuing a request', async () => {
    let requests = 0
    server.use(http.get(previewEndpoint, () => {
      requests += 1
      return HttpResponse.json(envelope('/products'))
    }))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-b'), '/products'),
    ).rejects.toBeInstanceOf(CrossSiteContentError)
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products/coatings/'),
    ).rejects.toBeInstanceOf(InvalidContentPathError)
    expect(requests).toBe(0)
  })

  it('never leaks a successful preview through a later no-store miss', async () => {
    let available = true
    server.use(http.get(previewEndpoint, () => available
      ? HttpResponse.json(envelope('/products'))
      : HttpResponse.json({code: 'tio2_preview_not_found'}, {status: 404}),
    ))
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).resolves.toMatchObject({level: 'hub'})
    available = false
    await expect(
      getProductPagePreview(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({name: 'ProductPagePreviewNotFoundError'})
  })
})
