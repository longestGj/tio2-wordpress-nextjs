import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const headerMocks = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  cookies: vi.fn(),
}))

headerMocks.cookies.mockImplementation(async () => ({get: headerMocks.cookieGet}))

vi.mock('next/headers', () => ({cookies: headerMocks.cookies}))

import {GET} from '@/app/api/preview/route'
import {
  createPreviewSessionToken,
  isValidPreviewSessionToken,
  previewSessionCookieName,
} from '@/lib/wordpress/preview-session'
import {validProductPageInput} from '@/tests/fixtures/product-page'
import {server} from '@/tests/mocks/server'

const previewSecret = 'product-preview-entry-secret'
const wordpressPreviewSecret = 'product-preview-wordpress-secret'
const wordpressPreviewUrl = 'http://wordpress.test/wp-json/tio2/v1/preview'
const canonicalPath = '/products/tp-c120'
const protectedPath = '/preview/products/tp-c120'

function signedParameters(
  siteId: string,
  path: string,
  expires = Math.floor(Date.now() / 1000) + 300,
): Record<string, string> {
  return {
    siteId,
    path,
    expires: String(expires),
    signature: createHmac('sha256', previewSecret)
      .update(`${expires}\n${siteId}\n${path}`)
      .digest('hex'),
  }
}

function previewRequest(parameters: Record<string, string>): Request {
  const url = new URL('http://localhost/api/preview')
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value)
  }
  return new Request(url)
}

function productInput() {
  const input = structuredClone(validProductPageInput)
  input.identity.productId = 'TP-C120'
  input.identity.slug = 'tp-c120'
  input.identity.path = canonicalPath
  input.identity.title = 'TIOVAR TP-C120 protected preview'
  return input
}

function productPreviewResponse(overrides: Record<string, unknown> = {}) {
  const product = productInput()
  return {
    id: 'product-draft-120',
    databaseId: 120,
    siteId: 'tio2-a',
    path: canonicalPath,
    slug: 'tp-c120',
    title: product.identity.title,
    modifiedGmt: product.identity.modified,
    status: 'draft',
    productFields: {
      productId: product.identity.productId,
      family: product.identity.family,
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
      packaging: product.packaging,
      tdsAccess: product.tdsAccess,
      fitWhen: product.selection.fitWhen.map((item) => ({item})),
      discussFirstWhen: product.selection.discussFirstWhen.map((item) => ({item})),
      performancePriorities: product.performancePriorities.map((priority) => ({
        ...priority,
      })),
      recommendedApplications: product.recommendedApplications.map((application) => ({
        ...application,
      })),
      evidenceStatement: product.evidenceHtml,
      typicalProperties: product.typicalProperties.map((property) => ({
        ...property,
        method: property.method ?? '',
        note: property.note ?? '',
      })),
      validationChecklist: product.validationChecklist.map((item) => ({item})),
      faqItems: product.faqs.map(({question, answerHtml}) => ({
        question,
        answer: answerHtml,
      })),
      relatedLinks: {
        applications: product.relatedLinks.applications.map((link) => ({...link})),
        resources: product.relatedLinks.resources.map((link) => ({...link})),
        products: product.relatedLinks.products.map((link) => ({...link})),
      },
    },
    productSettingsFields: {
      inquiryFields: product.enquiryFields.map((field) => ({...field})),
      requestTdsCta: {...product.ctas.requestTds},
      discussApplicationCta: {...product.ctas.discussApplication},
      technicalDisclaimer: product.disclaimerHtml,
    },
    ...overrides,
  }
}

function genericPreviewResponse(siteId: string, path: string) {
  return {
    id: 'page-draft-42',
    siteId,
    path,
    title: 'Generic Page or Post preview',
    html: '<p>Generic preview body.</p>',
    modified: '2026-08-23T02:30:00.000Z',
    status: 'draft',
    seo: {title: '', description: ''},
  }
}

function sessionToken(response: Response): string {
  const header = response.headers.get('set-cookie') ?? ''
  const match = new RegExp(`(?:^|; )${previewSessionCookieName(canonicalPath)}=([^;]+)`, 'u').exec(header)
  if (!match?.[1]) throw new Error('Missing preview session cookie')
  return match[1]
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-a')
  vi.stubEnv('PREVIEW_SECRET', previewSecret)
  vi.stubEnv('WORDPRESS_PREVIEW_URL', wordpressPreviewUrl)
  vi.stubEnv('WORDPRESS_PREVIEW_SECRET', wordpressPreviewSecret)
  headerMocks.cookieGet.mockReturnValue(undefined)
  server.use(
    http.get(wordpressPreviewUrl, ({request}) => {
      const url = new URL(request.url)
      const siteId = url.searchParams.get('siteId') ?? ''
      const path = url.searchParams.get('path') ?? ''
      return HttpResponse.json(
        path === canonicalPath
          ? productPreviewResponse()
          : genericPreviewResponse(siteId, path),
      )
    }),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('protected Product preview entry', () => {
  it('redirects a valid canonical Product token to the protected path with an exactly scoped cookie', async () => {
    let observedRequest: Request | undefined
    server.use(
      http.get(wordpressPreviewUrl, ({request}) => {
        observedRequest = request
        return HttpResponse.json(productPreviewResponse())
      }),
    )

    const response = await GET(
      previewRequest(signedParameters('tio2-a', canonicalPath)),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(protectedPath)
    expect(response.headers.get('set-cookie')).toContain(`Path=${protectedPath}`)
    expect(response.headers.get('set-cookie')).not.toContain(`Path=${canonicalPath}`)
    expect(observedRequest?.cache).toBe('no-store')

    const observedUrl = new URL(observedRequest?.url ?? 'http://invalid.test')
    const timestamp = observedRequest?.headers.get('x-tio2-preview-timestamp') ?? ''
    expect(observedUrl.searchParams.get('siteId')).toBe('tio2-a')
    expect(observedUrl.searchParams.get('path')).toBe(canonicalPath)
    expect(observedRequest?.headers.get('x-tio2-preview-signature')).toBe(
      createHmac('sha256', wordpressPreviewSecret)
        .update(`${timestamp}\ntio2-a\n${canonicalPath}`)
        .digest('hex'),
    )
  })

  it('binds the protected-path cookie token to the canonical Product path', async () => {
    const response = await GET(
      previewRequest(signedParameters('tio2-a', canonicalPath)),
    )
    const token = sessionToken(response)

    expect(
      isValidPreviewSessionToken(token, previewSecret, 'tio2-a', canonicalPath),
    ).toBe(true)
    expect(
      isValidPreviewSessionToken(token, previewSecret, 'tio2-a', protectedPath),
    ).toBe(false)
    expect(
      isValidPreviewSessionToken(token, previewSecret, 'tio2-b', canonicalPath),
    ).toBe(false)
  })

  it('rejects a Product token for the wrong configured site', async () => {
    const response = await GET(
      previewRequest(signedParameters('tio2-b', canonicalPath)),
    )

    expect(response.status).toBe(400)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('rejects an expired Product signature before fetching WordPress', async () => {
    let requests = 0
    server.use(
      http.get(wordpressPreviewUrl, () => {
        requests += 1
        return HttpResponse.json(productPreviewResponse())
      }),
    )

    const response = await GET(
      previewRequest(
        signedParameters(
          'tio2-a',
          canonicalPath,
          Math.floor(Date.now() / 1000) - 1,
        ),
      ),
    )

    expect(response.status).toBe(401)
    expect(requests).toBe(0)
  })

  it('rejects a canonical Product signature replayed for another path', async () => {
    const parameters = signedParameters('tio2-a', canonicalPath)
    parameters.path = '/products/tp-c121'

    const response = await GET(previewRequest(parameters))

    expect(response.status).toBe(401)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not create a session for a missing Product draft', async () => {
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({code: 'tio2_preview_not_found'}, {status: 404}),
      ),
    )

    const response = await GET(
      previewRequest(signedParameters('tio2-a', canonicalPath)),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('fails closed when the Product response path does not match the signed path', async () => {
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json(productPreviewResponse({path: '/products/tp-c121'})),
      ),
    )

    const response = await GET(
      previewRequest(signedParameters('tio2-a', canonicalPath)),
    )

    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('does not create a session for an invalid Product render contract', async () => {
    const invalid = productPreviewResponse()
    invalid.productFields.family = ''
    server.use(
      http.get(wordpressPreviewUrl, () => HttpResponse.json(invalid)),
    )

    const response = await GET(
      previewRequest(signedParameters('tio2-a', canonicalPath)),
    )

    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('preserves the generic Page/Post preview redirect and cookie scope', async () => {
    const path = '/applications/non-inventory-generic-draft'

    const response = await GET(
      previewRequest(signedParameters('tio2-a', path)),
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(path)
    expect(response.headers.get('set-cookie')).toContain(`Path=${path}`)
    expect(response.headers.get('set-cookie')).not.toContain('/preview/products/')
  })
})

describe('protected Product preview page', () => {
  function authorize(path = canonicalPath, siteId = 'tio2-a') {
    headerMocks.cookieGet.mockReturnValue({
      value: createPreviewSessionToken(
        siteId,
        path,
        Math.floor(Date.now() / 1000) + 300,
        previewSecret,
      ),
    })
  }

  it('generates exact Product metadata while remaining noindex and noncanonical', async () => {
    authorize()
    const {generateMetadata} = await import('@/app/preview/products/[slug]/page')
    const metadata = await generateMetadata({
      params: Promise.resolve({slug: 'tp-c120'}),
    })

    expect(metadata).toEqual({
      title: productInput().seo.title,
      description: productInput().seo.description,
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).toBeUndefined()
    expect(metadata.openGraph).toBeUndefined()
  })

  it('renders the completed Product page only for an exact canonical session', async () => {
    authorize()
    const {default: ProductPreviewPage} = await import(
      '@/app/preview/products/[slug]/page'
    )

    const markup = renderToStaticMarkup(
      await ProductPreviewPage({params: Promise.resolve({slug: 'tp-c120'})}),
    )

    expect(markup).toContain('<main data-site-id="tio2-a">')
    expect(markup).toContain('data-product-id="TP-C120"')
    expect(markup).toContain('TIOVAR TP-C120 protected preview')
    expect(markup).toContain('Exterior architectural coatings')
    expect(markup).not.toContain('href="/applications/exterior-architectural-coatings"')
    expect(markup).toContain('data-product-section="related-applications-and-resources"')
    expect(markup).toContain('<span>Coatings applications</span>')
    expect(markup).toContain('<span>How to compare titanium dioxide grades</span>')
    expect(markup).toContain('<span>TIOVAR TP-Z912</span>')
    expect(markup).not.toContain('href="/applications/coatings"')
    expect(markup).not.toContain('href="/resources/compare-titanium-dioxide-grades"')
    expect(markup).not.toContain('href="/products/tp-z912"')
  })

  it('returns not-found without fetching when the cookie is scoped to another canonical Product', async () => {
    authorize('/products/tp-c121')
    let requests = 0
    server.use(
      http.get(wordpressPreviewUrl, () => {
        requests += 1
        return HttpResponse.json(productPreviewResponse())
      }),
    )
    const {default: ProductPreviewPage} = await import(
      '@/app/preview/products/[slug]/page'
    )

    await expect(
      ProductPreviewPage({params: Promise.resolve({slug: 'tp-c120'})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(requests).toBe(0)
  })

  it('returns not-found when the exact draft disappears after redirect', async () => {
    authorize()
    server.use(
      http.get(wordpressPreviewUrl, () =>
        HttpResponse.json({code: 'tio2_preview_not_found'}, {status: 404}),
      ),
    )
    const {default: ProductPreviewPage} = await import(
      '@/app/preview/products/[slug]/page'
    )

    await expect(
      ProductPreviewPage({params: Promise.resolve({slug: 'tp-c120'})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  })
})
