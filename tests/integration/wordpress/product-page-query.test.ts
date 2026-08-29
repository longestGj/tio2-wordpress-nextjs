import {delay, http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {ProductPageContractError} from '@/lib/products/page-dto'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {
  SITE_A_PRODUCT_FAMILIES,
  SITE_A_PRODUCT_IDENTITIES,
} from '@/lib/products/page-graph'
import {GraphQLNetworkError, GraphQLTimeoutError} from '@/lib/wordpress/client'
import {
  productDetailTag,
  productFamilyTag,
  productsHubTag,
  routeTag,
  siteTag,
} from '@/lib/wordpress/cache-tags'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {getSiteConfig} from '@/sites'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'
import {graphqlEndpoint} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

function collectionLink(target: {type: string; id: string}, databaseId: number) {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) throw new Error(`Missing canonical target ${target.type}:${target.id}`)
  return {
    databaseId,
    title: `Editorial ${target.id}`,
    path: canonical.path,
  }
}

function hubResponse() {
  const page = productsHubPageInput
  return {
    tio2ProductsHub: {
      siteId: 'tio2-a',
      level: 'hub',
      path: page.identity.path,
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
      knownGradeHeading: page.presentation.knownGrade.heading,
      knownGradeHelp: page.presentation.knownGrade.help,
      decisionPath: JSON.stringify(page.decisionPath),
      applicationBoundary: JSON.stringify(page.applicationBoundary),
      resources: page.resources.map((target, index) =>
        collectionLink(target, 200 + index),
      ),
      enquiry: JSON.stringify(page.enquiry),
      faqItems: page.faqs.map(({question, answerHtml}) => ({
        question,
        answer: answerHtml,
      })),
      technicalDisclaimer: page.disclaimerHtml,
    },
  }
}

function familyResponse() {
  const page = coatingsFamilyPageInput
  return {
    tio2ProductFamily: {
      siteId: 'tio2-a',
      level: 'family',
      path: page.identity.path,
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
      applications: page.applications.map((target, index) =>
        collectionLink(target, 400 + index),
      ),
      resources: page.resources.map((target, index) =>
        collectionLink(target, 500 + index),
      ),
      enquiry: JSON.stringify(page.enquiry),
      faqItems: page.faqs.map(({question, answerHtml}) => ({
        question,
        answer: answerHtml,
      })),
      technicalDisclaimer: page.disclaimerHtml,
    },
  }
}

function relationship(
  target: {type: 'application' | 'resource' | 'product'; id: string},
) {
  const canonical =
    target.type === 'product'
      ? SITE_A_PRODUCT_IDENTITIES.find(({id}) => id === target.id)
      : resolveCanonicalEditorialTarget(target.type, target.id)
  if (!canonical) throw new Error(`Missing relationship ${target.type}:${target.id}`)
  return {
    __typename:
      target.type === 'application'
        ? 'Tio2Application'
        : target.type === 'resource'
          ? 'Tio2Document'
          : 'Tio2Product',
    title: `Editorial ${target.id}`,
    uri: `${canonical.path}/`,
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-a'}]},
  }
}

function detailResponse() {
  const page = tpC120ProductPageInput
  const snapshot = Object.fromEntries(page.snapshot.map(({label, value}) => [label, value]))
  return {
    tio2Product: {
      id: 'product-tp-c120',
      databaseId: 120,
      slug: page.identity.slug,
      title: page.identity.title,
      modifiedGmt: page.identity.modified,
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-a'}]},
      productFields: {
        productId: page.identity.productId,
        family: {nodes: [{name: 'Coatings'}]},
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
        fitWhen: page.fitCheck.fitWhen.map((item) => ({item})),
        discussFirstWhen: page.fitCheck.discussFirstWhen.map((item) => ({item})),
        performancePriorities: page.formulationPriorities,
        recommendedApplications: {
          nodes: [{
            ...relationship(page.applicationContext.application),
            excerpt: page.applicationContext.description,
          }],
        },
        evidenceStatement: page.technicalNote,
        typicalProperties: page.technicalProperties.map((property) => ({
          ...property,
          method: '',
          note: '',
        })),
        validationChecklist: page.validationSteps.map((item) => ({
          item: JSON.stringify(item),
        })),
        packaging: page.enquiryPreparation.packaging,
        tdsAccess: page.enquiryPreparation.tdsAccess,
        faqItems: page.faqs.map(({question, answerHtml}) => ({
          question,
          answer: answerHtml,
        })),
        relatedLinks: {
          applications: {nodes: []},
          resources: {
            nodes: page.relatedLinks.resources.map(relationship),
          },
          products: {
            nodes: page.relatedLinks.products.map(relationship),
          },
        },
      },
    },
    tio2ProductSettings: {
      inquiryFields: page.enquiryPreparation.items.map((item, index) => ({
        key: `item-${index + 1}`,
        label: item,
        guidance: item,
      })),
      requestTdsCta: {label: 'Request a TDS', description: 'Request by enquiry.'},
      discussApplicationCta: {
        label: 'Discuss Your Application',
        description: 'Discuss by enquiry.',
      },
      technicalDisclaimer: page.disclaimerHtml,
    },
  }
}

function dataFor(path: string) {
  if (path === '/products') return hubResponse()
  if (path === '/products/coatings') return familyResponse()
  if (path === '/products/coatings/tp-c120') return detailResponse()
  return {tio2ProductsHub: null}
}

async function loadFreshProductPageReader() {
  vi.resetModules()
  return (await import('@/lib/wordpress/product-page-queries')).getSiteProductPage
}

beforeEach(() => {
  process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('three-level Product page cache tags', () => {
  it('builds deterministic Site A Hub, Family, and Detail tags', () => {
    expect(productsHubTag('tio2-a')).toBe('products-hub:tio2-a')
    expect(productFamilyTag('tio2-a', 'coatings')).toBe(
      'product-family:tio2-a:coatings',
    )
    expect(productDetailTag('tio2-a', 'coatings', 'tp-c120')).toBe(
      'product-detail:tio2-a:coatings:tp-c120',
    )
  })

  it('rejects noncanonical Family and Detail tag inputs', () => {
    expect(() => productFamilyTag('tio2-a', 'unknown')).toThrow()
    expect(() => productDetailTag('tio2-a', 'coatings', 'TP-C120')).toThrow()
    expect(() => productDetailTag('tio2-a', 'plastics-masterbatch', 'tp-c120')).toThrow()
  })
})

describe('getSiteProductPage', () => {
  it('maps queried Known Grade copy and frozen v0.5 fallback into the Hub DTO', async () => {
    const response = hubResponse()
    response.tio2ProductsHub.knownGradeHeading = 'Queried known-grade heading'
    response.tio2ProductsHub.knownGradeHelp = 'Queried known-grade help.'
    server.use(
      http.post(graphqlEndpoint, () => HttpResponse.json({data: response})),
    )

    const result = await getSiteProductPage(
      getSiteConfig('tio2-a'),
      '/products',
    )

    expect(result?.level).toBe('hub')
    if (result?.level !== 'hub') throw new Error('Expected Hub DTO')
    expect(result.presentation.knownGrade).toMatchObject({
      heading: 'Queried known-grade heading',
      help: 'Queried known-grade help.',
      searchLabel: 'Find a TIOVAR grade',
      searchPlaceholder: 'Try TP-C120 or C120',
      noResults: 'No matching grade',
    })
    expect(result.presentation.resources.cards).toEqual([
      {
        category: 'Selection',
        description:
          'See how pigment properties work together in an industrial formulation.',
      },
      {
        category: 'Treatment',
        description:
          'Connect surface treatment with dispersion, processing and finished-product performance.',
      },
      {
        category: 'Validation',
        description:
          'Plan a matched comparison using the formulation and test conditions that matter.',
      },
    ])
    expect(result.decisionPath).toEqual(productsHubPageInput.decisionPath)
    expect(result.applicationBoundary).toMatchObject({
      heading: productsHubPageInput.applicationBoundary.heading,
      description: productsHubPageInput.applicationBoundary.description,
      link: {id: productsHubPageInput.applicationBoundary.link.id},
    })
    expect(result.presentation.hero.familyAction.href).toBe('#product-families')
    expect(result.presentation.hero.enquiryAction.href).toBe(
      getSiteConfig('tio2-a').rfqHref,
    )
    expect(JSON.stringify(result.presentation)).not.toContain('arbitrary')
  })

  it('maps queried comparison introduction and frozen v0.5 fallback into the Family DTO', async () => {
    const response = familyResponse()
    response.tio2ProductFamily.comparisonIntroduction =
      'Queried comparison introduction.'
    server.use(
      http.post(graphqlEndpoint, () => HttpResponse.json({data: response})),
    )

    const result = await getSiteProductPage(
      getSiteConfig('tio2-a'),
      '/products/coatings',
    )

    expect(result?.level).toBe('family')
    if (result?.level !== 'family') throw new Error('Expected Family DTO')
    expect(result.presentation.comparison.intro).toBe(
      'Queried comparison introduction.',
    )
    expect(result.presentation.familyNavigation).toMatchObject({
      heading: 'Explore coatings grades',
      searchPlaceholder: 'Filter by model',
      noResults: 'No matching coatings grades',
    })
    expect(result.presentation.familyNavigation.candidates[3]).toEqual({
      productId: 'TP-C120',
      highlights:
        'Relatively low viscosity · Bluish tone · Hiding power · Gloss · Durability',
      badge: 'Premium',
    })
    expect(result.presentation.familyNavigation.candidates[7]).toEqual({
      productId: 'TP-C400',
      highlights:
        'Ultra-high weather resistance · Chalk resistance · Color retention · Dispersibility',
      badge: null,
    })
    expect(result.comparison.products[7]!.performanceFocus).toBe(
      'Ultra-high weather resistance, chalk resistance, color retention, gloss, hiding power',
    )
    expect(result.presentation.resources.cards).toHaveLength(3)
    expect(result.presentation.enquiryContextFields).toHaveLength(5)
    expect(result.presentation.hero.familyAction.href).toBe('#family-candidates')
    expect(result.presentation.hero.enquiryAction.href).toBe(
      getSiteConfig('tio2-a').rfqHref,
    )
  })

  it.each([
    ['/products', 'hub'],
    ['/products/coatings', 'family'],
    ['/products/coatings/tp-c120', 'detail'],
  ] as const)('queries and validates the representative %s page', async (path, level) => {
    server.use(http.post(graphqlEndpoint, async ({request}) => {
      const body = (await request.json()) as GraphQLRequestBody
      expect(body.variables).not.toHaveProperty('siteId', 'tio2-b')
      if (level === 'hub') {
        expect(body.query).toContain('tio2ProductsHub(siteId: $siteId)')
        expect(body.variables).toEqual({siteId: 'tio2-a'})
      } else if (level === 'family') {
        expect(body.query).toContain('tio2ProductFamily(siteId: $siteId, slug: $slug)')
        expect(body.variables).toEqual({siteId: 'tio2-a', slug: 'coatings'})
      } else {
        expect(body.query).toContain('tio2Product(id: $slug, idType: SLUG)')
        expect(body.query).toContain('tio2ProductSettings(siteId: $siteId)')
        expect(body.variables).toEqual({siteId: 'tio2-a', slug: 'tp-c120'})
      }
      return HttpResponse.json({data: dataFor(path)})
    }))

    const result = await getSiteProductPage(getSiteConfig('tio2-a'), path)

    expect(result?.level).toBe(level)
    expect(result?.identity.path).toBe(path)
    expect(isValidatedProductExperiencePage(result)).toBe(true)
    if (result?.level === 'hub') {
      expect(result.families.filter(({href}) => href !== null).map(({slug}) => slug)).toEqual([
        'coatings',
      ])
      expect(
        result.knownGrades
          .filter(({href}) => href !== null)
          .map(({productId}) => productId),
      ).toEqual(['TP-C120'])
    }
    if (result?.level === 'family') {
      expect(
        result.products.filter(({href}) => href !== null).map(({productId}) => productId),
      ).toEqual(['TP-C120'])
    }
    if (result?.level === 'detail') {
      expect(result.relatedLinks.family).toMatchObject({
        id: 'coatings',
        path: '/products/coatings',
        href: '/products/coatings',
      })
      expect(result.hero.ctas.every(({href}) => href === getSiteConfig('tio2-a').rfqHref)).toBe(true)
    }
  })

  it.each([
    ['/products', [siteTag('tio2-a'), productsHubTag('tio2-a'), routeTag('tio2-a', '/products')]],
    ['/products/coatings', [siteTag('tio2-a'), productFamilyTag('tio2-a', 'coatings'), routeTag('tio2-a', '/products/coatings')]],
    ['/products/coatings/tp-c120', [siteTag('tio2-a'), productDetailTag('tio2-a', 'coatings', 'tp-c120'), routeTag('tio2-a', '/products/coatings/tp-c120')]],
  ] as const)('attaches only the exact dependency tags for %s', async (path, expectedTags) => {
    server.use(http.post(graphqlEndpoint, () =>
      HttpResponse.json({data: dataFor(path)}),
    ))
    const nativeFetch = globalThis.fetch
    let observed: (RequestInit & {next?: {tags?: readonly string[]}}) | undefined
    globalThis.fetch = async (input, init) => {
      observed = init as typeof observed
      return nativeFetch(input, init)
    }
    try {
      await getSiteProductPage(getSiteConfig('tio2-a'), path)
    } finally {
      globalThis.fetch = nativeFetch
    }
    expect(observed?.cache).toBe('force-cache')
    expect(observed?.next?.tags).toEqual(expectedTags)
  })

  it('returns null for an absent page and rejects wrong or noncanonical paths before a fetch', async () => {
    let requests = 0
    server.use(http.post(graphqlEndpoint, () => {
      requests += 1
      return HttpResponse.json({data: {tio2ProductFamily: null}})
    }))

    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings'),
    ).resolves.toBeNull()
    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings/'),
    ).resolves.toBeNull()
    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products/not-approved'),
    ).resolves.toBeNull()
    expect(requests).toBe(1)
  })

  it('fails closed on wrong Site, path, Family, and a first malformed contract', async () => {
    const wrongPath = hubResponse()
    wrongPath.tio2ProductsHub.path = '/products/coatings'
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: wrongPath})))
    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products'),
    ).resolves.toBeNull()

    const wrongFamily = detailResponse()
    wrongFamily.tio2Product.productFields.family.nodes = [{name: 'Plastics & Masterbatch'}]
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: wrongFamily})))
    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings/tp-c120'),
    ).resolves.toBeNull()

    const malformed = familyResponse()
    malformed.tio2ProductFamily.metaTitle = ''
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: malformed})))
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings'),
    ).rejects.toMatchObject({name: ProductPageContractError.name})
  })

  it('fails closed when queried Family resources drift beyond the frozen card contract', async () => {
    const malformed = familyResponse()
    malformed.tio2ProductFamily.resources.push(
      collectionLink({type: 'resource', id: 'article-06'}, 599),
    )
    server.use(
      http.post(graphqlEndpoint, () => HttpResponse.json({data: malformed})),
    )
    const freshGetSiteProductPage = await loadFreshProductPageReader()

    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings'),
    ).rejects.toMatchObject({name: ProductPageContractError.name})
  })

  it('preserves the previous valid page when a refresh payload fails validation', async () => {
    let response = familyResponse()
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: response})))
    const first = await getSiteProductPage(
      getSiteConfig('tio2-a'),
      '/products/coatings',
    )
    response = familyResponse()
    response.tio2ProductFamily.products = response.tio2ProductFamily.products.slice(1)

    await expect(
      getSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings'),
    ).resolves.toBe(first)
  })

  it('throws the typed GraphQL timeout error when no same-key last-valid exists', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => nativeTimeout(20))
    server.use(http.post(graphqlEndpoint, async () => {
      await delay('infinite')
      return HttpResponse.json({data: hubResponse()})
    }))
    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({name: GraphQLTimeoutError.name, timeoutMs: 8_000})
  })

  it('returns the same-key last-valid DTO when a public refresh times out', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    server.use(http.post(graphqlEndpoint, () =>
      HttpResponse.json({data: familyResponse()}),
    ))
    const first = await freshGetSiteProductPage(
      getSiteConfig('tio2-a'),
      '/products/coatings',
    )

    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => nativeTimeout(20))
    server.use(http.post(graphqlEndpoint, async () => {
      await delay('infinite')
      return HttpResponse.json({data: familyResponse()})
    }))

    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings'),
    ).resolves.toBe(first)
  })

  it('does not reuse last-valid content across canonical paths or Sites', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    server.use(http.post(graphqlEndpoint, () =>
      HttpResponse.json({data: familyResponse()}),
    ))
    await freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products/coatings')

    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => nativeTimeout(20))
    let requests = 0
    server.use(http.post(graphqlEndpoint, async () => {
      requests += 1
      await delay('infinite')
      return HttpResponse.json({data: hubResponse()})
    }))

    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({name: GraphQLTimeoutError.name})
    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-b'), '/products/coatings'),
    ).resolves.toBeNull()
    expect(requests).toBe(1)
  })

  it('does not swallow a non-timeout transport error after a valid refresh', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    server.use(http.post(graphqlEndpoint, () =>
      HttpResponse.json({data: hubResponse()}),
    ))
    await freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products')
    server.use(http.post(graphqlEndpoint, () => HttpResponse.error()))

    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toMatchObject({name: GraphQLNetworkError.name})
  })

  it('does not swallow an unexpected programming error after a valid refresh', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    server.use(http.post(graphqlEndpoint, () =>
      HttpResponse.json({data: hubResponse()}),
    ))
    await freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products')
    const programmingError = new TypeError('unexpected platform failure')
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => {
      throw programmingError
    })

    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products'),
    ).rejects.toBe(programmingError)
  })

  it('bounds the prototype store to the three exact representative paths', async () => {
    const freshGetSiteProductPage = await loadFreshProductPageReader()
    let requests = 0
    server.use(http.post(graphqlEndpoint, async ({request}) => {
      requests += 1
      const body = (await request.json()) as GraphQLRequestBody
      const path = body.query?.includes('GetSiteProductsHub')
        ? '/products'
        : body.variables?.slug === 'coatings'
          ? '/products/coatings'
          : '/products/coatings/tp-c120'
      return HttpResponse.json({data: dataFor(path)})
    }))

    for (const path of [
      '/products',
      '/products/coatings',
      '/products/coatings/tp-c120',
    ]) {
      await expect(
        freshGetSiteProductPage(getSiteConfig('tio2-a'), path),
      ).resolves.not.toBeNull()
    }
    await expect(
      freshGetSiteProductPage(getSiteConfig('tio2-a'), '/products/not-approved'),
    ).resolves.toBeNull()
    expect(requests).toBe(3)
  })

  it('never issues an accidental Site B Product page query', async () => {
    let requests = 0
    server.use(http.post(graphqlEndpoint, () => {
      requests += 1
      return HttpResponse.json({data: hubResponse()})
    }))
    await expect(
      getSiteProductPage(getSiteConfig('tio2-b'), '/products'),
    ).resolves.toBeNull()
    expect(requests).toBe(0)
  })

  it('uses the approved graph rather than extending the Family or Detail inventory', () => {
    expect(SITE_A_PRODUCT_FAMILIES).toHaveLength(8)
    expect(SITE_A_PRODUCT_IDENTITIES).toHaveLength(34)
  })
})
