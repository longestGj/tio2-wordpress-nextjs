import {createHmac} from 'node:crypto'
import {http, HttpResponse} from 'msw'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GET} from '@/app/api/preview/route'
import {ApplicationContractError} from '@/lib/applications/dto'
import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import type {EditorialTarget} from '@/lib/editorial/types'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {ResourceContractError} from '@/lib/resources/dto'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {
  ApplicationPreviewNotFoundError,
  getApplicationPreview,
} from '@/lib/wordpress/application-preview'
import {
  createPreviewSessionToken,
  isValidPreviewSessionToken,
  previewSessionCookieName,
} from '@/lib/wordpress/preview-session'
import {PreviewTransportError} from '@/lib/wordpress/preview'
import {
  getResourcePreview,
  ResourcePreviewNotFoundError,
} from '@/lib/wordpress/resource-preview'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'
import {getSiteConfig} from '@/sites'
import applicationManifest from '@/tests/fixtures/editorial/site-a-applications.synthetic.json'
import resourceManifest from '@/tests/fixtures/editorial/site-a-resources.synthetic.json'
import {server} from '@/tests/mocks/server'

const entrySecret = 'application-resource-entry-secret'
const wordpressSecret = 'application-resource-wordpress-secret'
const wordpressPreviewUrl = 'http://wordpress.test/wp-json/tio2/v1/preview'
const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)

const applicationHub = structuredClone(applicationManifest.records[0])
const applicationCategory = structuredClone(applicationManifest.records[1])
const resourceHub = structuredClone(resourceManifest.records[0])
const resourceArticle = structuredClone(resourceManifest.records[1])

function canonicalTarget(target: EditorialTarget) {
  if (target.type === 'application') {
    const identity = SITE_A_APPLICATION_IDENTITIES.find(([id]) => id === target.id)
    if (!identity) throw new Error(`Unknown test Application: ${target.id}`)
    return {type: target.type, id: target.id, path: identity[2]}
  }
  if (target.type === 'resource') {
    const identity = SITE_A_RESOURCE_IDENTITIES.find(([id]) => id === target.id)
    if (!identity) throw new Error(`Unknown test Resource: ${target.id}`)
    return {type: target.type, id: target.id, path: identity[2]}
  }
  if (!SITE_A_PRODUCT_IDS.includes(target.id as (typeof SITE_A_PRODUCT_IDS)[number])) {
    throw new Error(`Unknown test Product: ${target.id}`)
  }
  return {type: target.type, id: target.id, path: productPaths.get(target.id) ?? ''}
}

function serializedLink(target: {type: string; id: string}) {
  if (!['application', 'resource', 'product'].includes(target.type)) {
    throw new Error(`Unknown test target type: ${target.type}`)
  }
  const canonical = canonicalTarget(target as EditorialTarget)
  return {
    targetType: canonical.type,
    targetKey: canonical.id,
    title: `Synthetic ${canonical.id}`,
    path: canonical.path,
    href: null,
  }
}

function applicationPreview(record = applicationCategory, overrides: Record<string, unknown> = {}) {
  const relationships = record.relationships.map(serializedLink)
  return {
    id: `application-${record.identity.id}`,
    databaseId: 201,
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
      parentApplication: record.identity.parentId
        ? serializedLink({type: 'application', id: record.identity.parentId})
        : null,
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
      startingProducts:
        'startingProducts' in record ? record.startingProducts : [],
      faqItems: record.faqs,
      childApplications: record.children.map(serializedLink),
      relatedApplications: relationships.filter(({targetType}) => targetType === 'application'),
      relatedResources: relationships.filter(({targetType}) => targetType === 'resource'),
      relatedProducts: relationships.filter(({targetType}) => targetType === 'product'),
      ctas: record.ctas,
      technicalDisclaimer: record.disclaimerHtml,
    },
    ...overrides,
  }
}

function resourcePreview(record = resourceArticle, overrides: Record<string, unknown> = {}) {
  const relationships = record.relationships.map(serializedLink)
  return {
    id: `resource-${record.identity.id}`,
    databaseId: 301,
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
      relatedApplications: relationships.filter(({targetType}) => targetType === 'application'),
      relatedResources: relationships.filter(({targetType}) => targetType === 'resource'),
      relatedProducts: relationships.filter(({targetType}) => targetType === 'product'),
      ctas: record.ctas,
      technicalDisclaimer: record.disclaimerHtml,
    },
    ...overrides,
  }
}

function genericPreview(siteId: string, path: string) {
  return {
    id: 'generic-draft',
    siteId,
    path,
    title: 'Generic Page or Post preview',
    html: '<p>Generic preview body.</p>',
    modified: '2026-08-27T08:00:00.000Z',
    status: 'draft',
    seo: {title: '', description: ''},
  }
}

function signedParameters(
  siteId: string,
  path: string,
  expires = Math.floor(Date.now() / 1000) + 300,
) {
  return {
    siteId,
    path,
    expires: String(expires),
    signature: createHmac('sha256', entrySecret)
      .update(`${expires}\n${siteId}\n${path}`)
      .digest('hex'),
  }
}

function previewRequest(parameters: Record<string, string>): Request {
  const url = new URL('http://localhost/api/preview')
  Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value))
  return new Request(url)
}

function sessionToken(response: Response, path: string): string {
  const header = response.headers.get('set-cookie') ?? ''
  const match = new RegExp(`(?:^|; )${previewSessionCookieName(path)}=([^;]+)`, 'u').exec(header)
  if (!match?.[1]) throw new Error('Missing preview session cookie')
  return match[1]
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-a')
  vi.stubEnv('PREVIEW_SECRET', entrySecret)
  vi.stubEnv('WORDPRESS_PREVIEW_URL', wordpressPreviewUrl)
  vi.stubEnv('WORDPRESS_PREVIEW_SECRET', wordpressSecret)
  server.use(http.get(wordpressPreviewUrl, ({request}) => {
    const url = new URL(request.url)
    const siteId = url.searchParams.get('siteId') ?? ''
    const path = url.searchParams.get('path') ?? ''
    if (path === applicationHub.identity.path) return HttpResponse.json(applicationPreview(applicationHub))
    if (path === applicationCategory.identity.path) return HttpResponse.json(applicationPreview(applicationCategory))
    if (path === resourceHub.identity.path) return HttpResponse.json(resourcePreview(resourceHub))
    if (path === resourceArticle.identity.path) return HttpResponse.json(resourcePreview(resourceArticle))
    return HttpResponse.json(genericPreview(siteId, path))
  }))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('dedicated no-store Application and Resource preview clients', () => {
  it('validates and normalizes exact canonical draft payloads over a signed no-store request', async () => {
    const observed: Request[] = []
    server.use(http.get(wordpressPreviewUrl, ({request}) => {
      observed.push(request)
      const path = new URL(request.url).searchParams.get('path')
      return HttpResponse.json(
        path === applicationCategory.identity.path
          ? applicationPreview(applicationCategory)
          : resourcePreview(resourceArticle),
      )
    }))

    const application = await getApplicationPreview(
      getSiteConfig('tio2-a'),
      applicationCategory.identity.path,
    )
    const resource = await getResourcePreview(
      getSiteConfig('tio2-a'),
      resourceArticle.identity.path,
    )

    expect(application.identity.id).toBe('coatings')
    expect(resource.identity.id).toBe('article-01')
    for (const request of observed) {
      const url = new URL(request.url)
      const timestamp = request.headers.get('x-tio2-preview-timestamp') ?? ''
      const path = url.searchParams.get('path') ?? ''
      expect(request.cache).toBe('no-store')
      expect(request.headers.get('x-tio2-preview-signature')).toBe(
        createHmac('sha256', wordpressSecret)
          .update(`${timestamp}\ntio2-a\n${path}`)
          .digest('hex'),
      )
    }
  })

  it('distinguishes missing and identity-mismatched records from transport or contract failures', async () => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({code: 'tio2_preview_not_found'}, {status: 404}),
    ))
    await expect(
      getApplicationPreview(getSiteConfig('tio2-a'), applicationCategory.identity.path),
    ).rejects.toBeInstanceOf(ApplicationPreviewNotFoundError)

    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json(resourcePreview(resourceArticle, {siteId: 'tio2-b'})),
    ))
    await expect(
      getResourcePreview(getSiteConfig('tio2-a'), resourceArticle.identity.path),
    ).rejects.toBeInstanceOf(CrossSiteContentError)
  })

  const previewKinds = [
    {
      label: 'Application',
      path: applicationCategory.identity.path,
      validPayload: () => applicationPreview(applicationCategory),
      getPreview: () => getApplicationPreview(
        getSiteConfig('tio2-a'),
        applicationCategory.identity.path,
      ),
      notFoundError: ApplicationPreviewNotFoundError,
      contractError: ApplicationContractError,
      identityFields: 'applicationFields',
      stableIdField: 'applicationId',
    },
    {
      label: 'Technical Resource',
      path: resourceArticle.identity.path,
      validPayload: () => resourcePreview(resourceArticle),
      getPreview: () => getResourcePreview(
        getSiteConfig('tio2-a'),
        resourceArticle.identity.path,
      ),
      notFoundError: ResourcePreviewNotFoundError,
      contractError: ResourceContractError,
      identityFields: 'resourceFields',
      stableIdField: 'resourceId',
    },
  ] as const

  it.each(previewKinds)('$label maps a non-OK transport response to 502 at the entry API', async ({
    path,
    getPreview,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({error: 'synthetic upstream failure'}, {status: 503}),
    ))

    await expect(getPreview()).rejects.toMatchObject({
      name: PreviewTransportError.name,
      status: 503,
    })
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps invalid JSON to 502 at the entry API', async ({
    path,
    getPreview,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      new HttpResponse('{', {headers: {'content-type': 'application/json'}}),
    ))

    await expect(getPreview()).rejects.toBeInstanceOf(PreviewTransportError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps a non-strict payload to 502 at the entry API', async ({
    path,
    validPayload,
    getPreview,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({...validPayload(), unexpectedPrivateField: 'must-not-pass'}),
    ))

    await expect(getPreview()).rejects.toBeInstanceOf(PreviewTransportError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps a response path mismatch to 404 at the entry API', async ({
    path,
    validPayload,
    getPreview,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({...validPayload(), path: `${path}-wrong`}),
    ))

    await expect(getPreview()).rejects.toBeInstanceOf(InvalidContentPathError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps a response slug mismatch to 404 at the entry API', async ({
    path,
    validPayload,
    getPreview,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({...validPayload(), slug: 'wrong-slug'}),
    ))

    await expect(getPreview()).rejects.toBeInstanceOf(InvalidContentPathError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps a non-draft response to 404 at the entry API', async ({
    path,
    validPayload,
    getPreview,
    notFoundError,
  }) => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json({...validPayload(), status: 'publish'}),
    ))

    await expect(getPreview()).rejects.toBeInstanceOf(notFoundError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it.each(previewKinds)('$label maps a stable identity mismatch to 502 at the entry API', async ({
    path,
    validPayload,
    getPreview,
    contractError,
    identityFields,
    stableIdField,
  }) => {
    const payload = validPayload() as unknown as Record<string, unknown>
    payload[identityFields] = {
      ...(payload[identityFields] as Record<string, unknown>),
      [stableIdField]: 'wrong-stable-id',
    }
    server.use(http.get(wordpressPreviewUrl, () => HttpResponse.json(payload)))

    await expect(getPreview()).rejects.toBeInstanceOf(contractError)
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))
    expect(response.status).toBe(502)
    expect(response.headers.get('set-cookie')).toBeNull()
  })
})

describe('Application and Resource preview entry redirects', () => {
  it.each([
    [applicationHub.identity.path, '/preview/applications'],
    [applicationCategory.identity.path, '/preview/applications/coatings'],
    [resourceHub.identity.path, '/preview/resources'],
    [resourceArticle.identity.path, '/preview/resources/rutile-vs-anatase-titanium-dioxide'],
  ])('redirects %s to one exact protected target and scopes the cookie to it', async (canonicalPath, browserPath) => {
    const response = await GET(previewRequest(signedParameters('tio2-a', canonicalPath)))

    expect(response.status).toBe(307)
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(response.headers.get('location')).toBe(browserPath)
    expect(response.headers.get('set-cookie')).toContain(`Path=${browserPath}`)
    const token = sessionToken(response, canonicalPath)
    expect(isValidPreviewSessionToken(token, entrySecret, 'tio2-a', canonicalPath)).toBe(true)
    expect(isValidPreviewSessionToken(token, entrySecret, 'tio2-a', browserPath)).toBe(false)
  })

  it('rejects invalid and expired signatures before preview validation', async () => {
    let requests = 0
    server.use(http.get(wordpressPreviewUrl, () => {
      requests += 1
      return HttpResponse.json(applicationPreview(applicationCategory))
    }))
    const invalid = signedParameters('tio2-a', applicationCategory.identity.path)
    invalid.signature = '0'.repeat(64)
    const expired = signedParameters(
      'tio2-a',
      resourceArticle.identity.path,
      Math.floor(Date.now() / 1000) - 1,
    )

    await expect(GET(previewRequest(invalid))).resolves.toMatchObject({status: 401})
    await expect(GET(previewRequest(expired))).resolves.toMatchObject({status: 401})
    expect(requests).toBe(0)
  })

  it('sets no cookie when the exact draft is malformed or owned by another site', async () => {
    server.use(http.get(wordpressPreviewUrl, () =>
      HttpResponse.json(applicationPreview(applicationCategory, {siteId: 'tio2-b'})),
    ))
    const wrongSite = await GET(
      previewRequest(signedParameters('tio2-a', applicationCategory.identity.path)),
    )
    expect(wrongSite.status).toBe(404)
    expect(wrongSite.headers.get('set-cookie')).toBeNull()

    const invalid = applicationPreview(applicationCategory)
    invalid.applicationFields.metaTitle = ''
    server.use(http.get(wordpressPreviewUrl, () => HttpResponse.json(invalid)))
    const malformed = await GET(
      previewRequest(signedParameters('tio2-a', applicationCategory.identity.path)),
    )
    expect(malformed.status).toBe(502)
    expect(malformed.headers.get('set-cookie')).toBeNull()
  })

  it('preserves generic Page/Post fallback for non-inventory paths under reserved prefixes', async () => {
    const path = '/applications/not-an-approved-identity'
    const response = await GET(previewRequest(signedParameters('tio2-a', path)))

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(path)
    expect(response.headers.get('set-cookie')).toContain(`Path=${path}`)
    expect(response.headers.get('set-cookie')).not.toContain('/preview/applications/')
  })

  it('preserves Product preview session token behavior', () => {
    const expires = Math.floor(Date.now() / 1000) + 300
    const token = createPreviewSessionToken('tio2-a', '/products/coatings/tp-c120', expires, entrySecret)

    expect(isValidPreviewSessionToken(token, entrySecret, 'tio2-a', '/products/coatings/tp-c120')).toBe(true)
    expect(isValidPreviewSessionToken(token, entrySecret, 'tio2-a', '/preview/products/coatings/tp-c120')).toBe(false)
  })
})
