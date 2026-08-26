import {delay, http, HttpResponse} from 'msw'
import {beforeEach, describe, expect, it, vi} from 'vitest'

import {ProductContractError} from '@/lib/products/dto'
import {validProductPageInput} from '@/tests/fixtures/product-page'
import {GraphQLTimeoutError} from '@/lib/wordpress/client'
import {
  productListTag,
  productTag,
} from '@/lib/wordpress/cache-tags'
import {getSiteProduct} from '@/lib/wordpress/product-queries'
import {getSiteConfig} from '@/sites'
import {graphqlEndpoint} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

async function readGraphQLRequest(request: Request) {
  return (await request.json()) as GraphQLRequestBody
}

function makeProductResponse(
  overrides: Record<string, unknown> = {},
  settingsOverrides: Record<string, unknown> = {},
) {
  const product = validProductPageInput

  return {
    tio2Product: {
      id: 'cHJvZHVjdDo5MTE=',
      databaseId: 911,
      slug: product.identity.slug,
      title: product.identity.title,
      modifiedGmt: product.identity.modified,
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-a'}]},
      productFields: {
        productId: product.identity.productId,
        family: {nodes: [{__typename: 'ProductFamily', name: product.identity.family}]},
        metaTitle: product.seo.title,
        metaDescription: product.seo.description,
        eyebrow: product.hero.eyebrow,
        customerProblemHeadline: product.hero.problemHeadline,
        quickAnswer: product.hero.quickAnswer,
        productType: product.snapshot.productType,
        process: product.snapshot.process,
        primaryApplication: product.snapshot.primaryApplication,
        positioning: product.snapshot.positioning,
        surfaceTreatment: product.snapshot.surfaceTreatment,
        fitWhen: product.selection.fitWhen.map((item) => ({item})),
        discussFirstWhen: product.selection.discussFirstWhen.map((item) => ({item})),
        performancePriorities: product.performancePriorities,
        recommendedApplications: {
          nodes: product.recommendedApplications.map((application, index) => ({
            __typename: 'Tio2Application',
            title: application.title,
            excerpt: `<p>${application.fit}</p>`,
            uri: application.href ?? `/applications/recommended-${index + 1}/`,
            status: 'publish',
            siteScopes: {nodes: [{slug: 'tio2-a'}]},
          })),
        },
        evidenceStatement: product.evidenceHtml,
        typicalProperties: product.typicalProperties,
        validationChecklist: product.validationChecklist.map((item) => ({item})),
        packaging: product.packaging,
        tdsAccess: product.tdsAccess,
        faqItems: product.faqs.map(({question, answerHtml}) => ({
          question,
          answer: answerHtml,
        })),
        relatedLinks: {
          applications: {
            nodes: product.relatedLinks.applications.map((link) => ({
              __typename: 'Tio2Application',
              title: link.title,
              uri: `${link.href}/`,
              status: 'publish',
              siteScopes: {nodes: [{slug: 'tio2-a'}]},
            })),
          },
          resources: {
            nodes: product.relatedLinks.resources.map((link) => ({
              __typename: 'Tio2Document',
              title: link.title,
              uri: `${link.href}/`,
              status: 'publish',
              siteScopes: {nodes: [{slug: 'tio2-a'}]},
            })),
          },
          products: {
            nodes: product.relatedLinks.products.map((link) => ({
              __typename: 'Tio2Product',
              title: link.title,
              uri: `${link.href}/`,
              status: 'publish',
              siteScopes: {nodes: [{slug: 'tio2-a'}]},
            })),
          },
        },
      },
      ...overrides,
    },
    tio2ProductSettings: {
      inquiryFields: product.enquiryFields,
      requestTdsCta: product.ctas.requestTds,
      discussApplicationCta: product.ctas.discussApplication,
      technicalDisclaimer: product.disclaimerHtml,
      ...settingsOverrides,
    },
  }
}

describe('Product cache tags', () => {
  it('builds Site A Product slug and list tags', () => {
    expect(productTag('tio2-a', 'tp-z911')).toBe('product:tio2-a:tp-z911')
    expect(productListTag('tio2-a')).toBe('product-list:tio2-a')
  })

  it('rejects a Product tag whose slug is not canonical lowercase', () => {
    expect(() => productTag('tio2-a', 'TP-Z911')).toThrow(
      'Invalid product slug',
    )
  })
})

describe('getSiteProduct', () => {
  beforeEach(() => {
    process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  })

  it('queries one Site A slug plus shared settings and returns the validated DTO', async () => {
    server.use(
      http.post(graphqlEndpoint, async ({request}) => {
        const body = await readGraphQLRequest(request)

        expect(body.query).toContain('tio2Product(id: $slug, idType: SLUG)')
        expect(body.query).toContain('tio2ProductSettings(siteId: $siteId)')
        expect(body.query).not.toContain('tio2Products(')
        expect(body.variables).toEqual({slug: 'tp-z911', siteId: 'tio2-a'})

        return HttpResponse.json({data: makeProductResponse()})
      }),
    )

    const result = await getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911')

    expect(result).toMatchObject({
      identity: {
        productId: 'TP-Z911',
        slug: 'tp-z911',
        path: '/products/tp-z911',
        title: 'TIOVAR TP-Z911 Rutile Titanium Dioxide',
        family: 'Rutile titanium dioxide',
        modified: '2026-08-26T08:30:00.000Z',
      },
      seo: validProductPageInput.seo,
      ctas: validProductPageInput.ctas,
      enquiryFields: validProductPageInput.enquiryFields,
      relatedLinks: validProductPageInput.relatedLinks,
      disclaimerHtml: validProductPageInput.disclaimerHtml,
    })
    expect(result?.recommendedApplications).toEqual(
      validProductPageInput.recommendedApplications,
    )
    expect(result?.typicalProperties).toEqual(
      validProductPageInput.typicalProperties,
    )
  })

  it('attaches force-cache plus the exact Product dependency tags', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({data: makeProductResponse()}),
      ),
    )
    const interceptedFetch = globalThis.fetch
    let observedInit: RequestInit & {
      next?: {readonly tags?: readonly string[]}
    } = {}
    globalThis.fetch = async (input, init) => {
      observedInit = init ?? {}
      return interceptedFetch(input, init)
    }

    try {
      await getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911')
    } finally {
      globalThis.fetch = interceptedFetch
    }

    expect(observedInit.cache).toBe('force-cache')
    expect(observedInit.next?.tags).toEqual([
      'site:tio2-a',
      'product:tio2-a:tp-z911',
      'product-list:tio2-a',
      'route:tio2-a:/products/tp-z911',
      'sitemap:tio2-a',
    ])
  })

  it('returns null when WordPress does not find the Product', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: {
            tio2Product: null,
            tio2ProductSettings: makeProductResponse().tio2ProductSettings,
          },
        }),
      ),
    )

    await expect(
      getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911'),
    ).resolves.toBeNull()
  })

  it('withholds a Product assigned to the wrong site', async () => {
    server.use(
      http.post(graphqlEndpoint, () =>
        HttpResponse.json({
          data: makeProductResponse({
            siteScopes: {nodes: [{slug: 'tio2-b'}]},
          }),
        }),
      ),
    )

    await expect(
      getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911'),
    ).resolves.toBeNull()
  })

  it('rejects a malformed Product contract instead of returning partial output', async () => {
    const response = makeProductResponse()
    response.tio2Product.productFields.metaTitle = ''
    server.use(
      http.post(graphqlEndpoint, () => HttpResponse.json({data: response})),
    )

    await expect(
      getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911'),
    ).rejects.toBeInstanceOf(ProductContractError)
  })

  it('preserves the typed timeout failure from WordPress', async () => {
    const nativeTimeout = AbortSignal.timeout.bind(AbortSignal)
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => nativeTimeout(20))
    server.use(
      http.post(graphqlEndpoint, async () => {
        await delay('infinite')
        return HttpResponse.json({data: makeProductResponse()})
      }),
    )

    await expect(
      getSiteProduct(getSiteConfig('tio2-a'), 'tp-z911'),
    ).rejects.toMatchObject({
      name: GraphQLTimeoutError.name,
      timeoutMs: 8_000,
    })
  })

  it('does not issue an accidental Site B Product query', async () => {
    let requestCount = 0
    server.use(
      http.post(graphqlEndpoint, () => {
        requestCount += 1
        return HttpResponse.json({data: makeProductResponse()})
      }),
    )

    await expect(
      getSiteProduct(getSiteConfig('tio2-b'), 'tp-z911'),
    ).resolves.toBeNull()
    expect(requestCount).toBe(0)
  })
})
