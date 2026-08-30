import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {
  SITE_A_RESOURCE_IDENTITIES,
  type SiteAResourceContentManifest,
} from '@/lib/resources/content-manifest'
import {toTechnicalResourcePageDto} from '@/lib/resources/dto'
import type {TechnicalResourcePageInput} from '@/lib/resources/schema'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import {resourceIdentityForPath} from '@/lib/wordpress/resource-queries'
import {getSiteConfig} from '@/sites'
import resourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.synthetic.json'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

const resourceManifest =
  resourceManifestJson as unknown as SiteAResourceContentManifest
const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: `Resolved ${target.type} ${target.id}`,
        path: canonical.path,
        href: null,
      }
    : null
}

function canonicalFixture(
  identity: (typeof SITE_A_RESOURCE_IDENTITIES)[number],
  mutateInput?: (input: TechnicalResourcePageInput) => void,
): TechnicalResourcePageDto {
  const source = resourceManifest.records.find(
    (record) => record.identity.id === identity[0],
  )
  if (!source) throw new Error(`Missing Resource fixture: ${identity[0]}`)
  const input = structuredClone(source) as TechnicalResourcePageInput
  mutateInput?.(input)
  return toTechnicalResourcePageDto(input, resolveTarget)
}

interface PublicScenario {
  readonly siteId?: 'tio2-a' | 'tio2-b'
  readonly approvedPaths?: readonly string[]
  readonly resource?: TechnicalResourcePageDto | null
}

async function loadPublicRoutes({
  siteId = 'tio2-a',
  approvedPaths = [],
  resource = null,
}: PublicScenario = {}) {
  const site = getSiteConfig(siteId)
  const calls: string[] = []
  const isPublicRoute = vi.fn((_siteId: string, path: string) => {
    calls.push(`gate:${path}`)
    return approvedPaths.includes(path)
  })
  const getSiteResource = vi.fn(async (_site: unknown, path: string) => {
    calls.push(`query:${path}`)
    return resource
  })

  vi.doMock('@/lib/sites/current-site', () => ({getCurrentSite: () => site}))
  vi.doMock('@/sites/public-routes', async () => {
    const actual = await vi.importActual<typeof import('@/sites/public-routes')>(
      '@/sites/public-routes',
    )
    return {...actual, isPublicRoute}
  })
  vi.doMock('@/lib/wordpress/resource-queries', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/resource-queries')
    >('@/lib/wordpress/resource-queries')
    return {...actual, getSiteResource}
  })

  const hub = await import('@/app/resources/page')
  const slug = await import('@/app/resources/[slug]/page')
  return {calls, getSiteResource, hub, isPublicRoute, slug}
}

interface PreviewScenario {
  readonly siteId?: 'tio2-a' | 'tio2-b'
  readonly hasSession?: boolean
  readonly resource?: TechnicalResourcePageDto
  readonly errorKind?:
    | 'not-found'
    | 'cross-site'
    | 'invalid-path'
    | 'contract'
    | 'transport'
}

async function loadPreviewRoutes({
  siteId = 'tio2-a',
  hasSession = true,
  resource = canonicalFixture(SITE_A_RESOURCE_IDENTITIES[0]),
  errorKind,
}: PreviewScenario = {}) {
  const site = getSiteConfig(siteId)
  let injectedError: Error | undefined
  const hasScopedPreviewSession = vi.fn(async () => hasSession)
  const getResourcePreview = vi.fn(async () => {
    if (injectedError) throw injectedError
    return resource
  })

  vi.doMock('@/lib/sites/current-site', () => ({getCurrentSite: () => site}))
  vi.doMock('@/lib/wordpress/preview-session', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/preview-session')
    >('@/lib/wordpress/preview-session')
    return {...actual, hasScopedPreviewSession}
  })
  vi.doMock('@/lib/wordpress/resource-preview', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/resource-preview')
    >('@/lib/wordpress/resource-preview')
    return {...actual, getResourcePreview}
  })

  const hub = await import('@/app/preview/resources/page')
  const slug = await import('@/app/preview/resources/[slug]/page')
  if (errorKind) {
    const preview = await import('@/lib/wordpress/resource-preview')
    const dto = await import('@/lib/resources/dto')
    const wordpressTypes = await import('@/lib/wordpress/types')
    const previewTransport = await import('@/lib/wordpress/preview')
    injectedError =
      errorKind === 'not-found'
        ? new preview.ResourcePreviewNotFoundError()
        : errorKind === 'cross-site'
          ? new wordpressTypes.CrossSiteContentError('tio2-a', ['tio2-b'])
          : errorKind === 'invalid-path'
            ? new wordpressTypes.InvalidContentPathError('/resources/wrong')
            : errorKind === 'contract'
              ? new dto.ResourceContractError(['identity'])
              : new previewTransport.PreviewTransportError(
                  'synthetic transport failure',
                )
  }
  return {
    getResourcePreview,
    hasScopedPreviewSession,
    hub,
    injectedError,
    slug,
  }
}

afterEach(() => {
  vi.doUnmock('@/lib/sites/current-site')
  vi.doUnmock('@/sites/public-routes')
  vi.doUnmock('@/lib/wordpress/resource-queries')
  vi.doUnmock('@/lib/wordpress/preview-session')
  vi.doUnmock('@/lib/wordpress/resource-preview')
  vi.clearAllMocks()
  vi.resetModules()
})

describe('public Technical Resource route gates', () => {
  it('uses one-hour revalidation and generates no private Resource params', async () => {
    const {hub, slug} = await loadPublicRoutes()

    expect(hub.revalidate).toBe(3600)
    expect(slug.revalidate).toBe(3600)
    expect(slug.dynamicParams).toBe(true)
    expect(await slug.generateStaticParams()).toEqual([])
  })

  it('returns not found for all 11 current canonical identities before any WordPress query', async () => {
    const {calls, getSiteResource, hub, isPublicRoute, slug} =
      await loadPublicRoutes()

    for (const identity of SITE_A_RESOURCE_IDENTITIES) {
      const props = {params: Promise.resolve({slug: identity[1]})}
      if (identity[3] === 'hub') {
        await expect(hub.default()).rejects.toMatchObject({
          digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
        })
        await expect(hub.generateMetadata()).rejects.toMatchObject({
          digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
        })
      } else {
        await expect(slug.default(props)).rejects.toMatchObject({
          digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
        })
        await expect(slug.generateMetadata(props)).rejects.toMatchObject({
          digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
        })
      }
    }

    expect(isPublicRoute).toHaveBeenCalledTimes(
      SITE_A_RESOURCE_IDENTITIES.length * 2,
    )
    expect(getSiteResource).not.toHaveBeenCalled()
    expect(calls.every((call) => call.startsWith('gate:'))).toBe(true)
  })

  it('queries each identity only after its separate public approval and renders through the TIOVAR shell', async () => {
    for (const identity of SITE_A_RESOURCE_IDENTITIES) {
      vi.resetModules()
      const resource = canonicalFixture(identity)
      const {calls, hub, slug} = await loadPublicRoutes({
        approvedPaths: [identity[2]],
        resource,
      })
      const markup = renderToStaticMarkup(
        identity[3] === 'hub'
          ? await hub.default()
          : await slug.default({params: Promise.resolve({slug: identity[1]})}),
      )

      expect(markup).toContain('<main data-site-id="tio2-a">')
      expect(markup).toContain('aria-label="TIOVAR sections"')
      expect(markup).toContain('type="application/ld+json"')
      expect(calls.slice(0, 2)).toEqual([
        `gate:${identity[2]}`,
        `query:${identity[2]}`,
      ])
    }
  })

  it('renders the exact composed Article mode after approval', async () => {
    const identity = SITE_A_RESOURCE_IDENTITIES[1]
    const resource = canonicalFixture(identity)
    const {slug} = await loadPublicRoutes({
      approvedPaths: [identity[2]],
      resource,
    })

    const markup = renderToStaticMarkup(
      await slug.default({params: Promise.resolve({slug: identity[1]})}),
    )
    expect(markup).toContain('data-resource-mode="technical-explainer"')
  })

  it('uses the public route visibility source for rendered and structured Article breadcrumbs', async () => {
    const identity = SITE_A_RESOURCE_IDENTITIES[1]
    const resource = canonicalFixture(identity)
    const {slug} = await loadPublicRoutes({
      approvedPaths: ['/resources', identity[2]],
      resource,
    })

    const markup = renderToStaticMarkup(
      await slug.default({params: Promise.resolve({slug: identity[1]})}),
    )
    const serializedJsonLd = markup.match(
      /<script type="application\/ld\+json">(.*?)<\/script>/u,
    )?.[1]
    if (!serializedJsonLd) throw new Error('Expected public Resource JSON-LD')
    const jsonLd = JSON.parse(serializedJsonLd) as Array<{
      '@type': string
      itemListElement?: Array<{name: string; item?: string}>
    }>
    const breadcrumbs = jsonLd.find(
      (node) => node['@type'] === 'BreadcrumbList',
    )

    expect(markup).toContain('<a href="/resources">Technical Resources</a>')
    expect(markup).toContain(
      `<a aria-current="page" href="${identity[2]}">${resource.identity.title}</a>`,
    )
    expect(breadcrumbs?.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://tio2products.com/',
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Technical Resources',
        item: 'https://tio2products.com/resources',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: resource.identity.title,
        item: `https://tio2products.com${identity[2]}`,
      },
    ])
  })

  it('rejects schema-valid but runtime-invalid Article and Hub DTOs before metadata or page output', async () => {
    const articleIdentity = SITE_A_RESOURCE_IDENTITIES[1]
    const unsafeArticle = canonicalFixture(articleIdentity, (input) => {
      input.seo.title = '<strong>Schema-valid but unsafe title</strong>'
    })
    const articleRuntime = await loadPublicRoutes({
      approvedPaths: [articleIdentity[2]],
      resource: unsafeArticle,
    })
    const articleProps = {
      params: Promise.resolve({slug: articleIdentity[1]}),
    }

    await expect(articleRuntime.slug.default(articleProps)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(
      articleRuntime.slug.generateMetadata(articleProps),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(articleRuntime.calls).toEqual([
      `gate:${articleIdentity[2]}`,
      `query:${articleIdentity[2]}`,
      `gate:${articleIdentity[2]}`,
      `query:${articleIdentity[2]}`,
    ])

    vi.resetModules()
    const hubIdentity = SITE_A_RESOURCE_IDENTITIES[0]
    const noncanonicalHub = canonicalFixture(hubIdentity, (input) => {
      input.children = input.children.slice(0, 1)
    })
    const hubRuntime = await loadPublicRoutes({
      approvedPaths: [hubIdentity[2]],
      resource: noncanonicalHub,
    })

    await expect(hubRuntime.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(hubRuntime.hub.generateMetadata()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(hubRuntime.calls).toEqual([
      'gate:/resources',
      'query:/resources',
      'gate:/resources',
      'query:/resources',
    ])
  })

  it('never recognizes TDS, PDF, local, or arbitrary Document locations as Resource identities', () => {
    for (const path of [
      '/resources/technical-data-sheet.pdf',
      '/documents/tds/tp-p100',
      'C:\\documents\\tds\\tp-p100.pdf',
      '/tmp/resources/article-01',
      '/resources/arbitrary-wordpress-document',
    ]) {
      expect(resourceIdentityForPath(path)).toBeNull()
    }
    expect(
      SITE_A_RESOURCE_IDENTITIES.every(
        ([, , path, kind]) =>
          !path.endsWith('.pdf') && (kind === 'hub' || kind === 'article'),
      ),
    ).toBe(true)
  })
})

describe('protected Technical Resource previews', () => {
  it('renders Hub and exact Article drafts behind source-path-bound sessions without JSON-LD', async () => {
    const hubResource = canonicalFixture(SITE_A_RESOURCE_IDENTITIES[0])
    const hubRuntime = await loadPreviewRoutes({resource: hubResource})
    const hubMarkup = renderToStaticMarkup(await hubRuntime.hub.default())

    expect(hubMarkup).toContain('data-resource-mode="hub"')
    expect(hubMarkup).toContain('aria-label="TIOVAR sections"')
    expect(hubMarkup).not.toContain('application/ld+json')
    expect(hubMarkup).not.toContain('<a href="/resources">')
    const hubMetadata = await hubRuntime.hub.generateMetadata()
    expect(hubMetadata).toEqual({
      title: hubResource.seo.title,
      description: hubResource.seo.description,
      robots: {index: false, follow: false},
    })
    expect(hubRuntime.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      '/resources',
    )
    expect(hubRuntime.getResourcePreview).toHaveBeenCalledWith(
      getSiteConfig('tio2-a'),
      '/resources',
    )

    vi.resetModules()
    const articleIdentity = SITE_A_RESOURCE_IDENTITIES[1]
    const articleResource = canonicalFixture(articleIdentity)
    const articleRuntime = await loadPreviewRoutes({resource: articleResource})
    const articleMarkup = renderToStaticMarkup(
      await articleRuntime.slug.default({
        params: Promise.resolve({slug: articleIdentity[1]}),
      }),
    )

    expect(articleMarkup).toContain('data-resource-mode="technical-explainer"')
    expect(articleMarkup).toContain('aria-label="TIOVAR sections"')
    expect(articleMarkup).not.toContain('application/ld+json')
    expect(articleMarkup).not.toContain(`<a href="${articleIdentity[2]}">`)
    const articleMetadata = await articleRuntime.slug.generateMetadata({
      params: Promise.resolve({slug: articleIdentity[1]}),
    })
    expect(articleMetadata).toEqual({
      title: articleResource.seo.title,
      description: articleResource.seo.description,
      robots: {index: false, follow: false},
    })
    expect(articleRuntime.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      articleIdentity[2],
    )
    expect(articleRuntime.getResourcePreview).toHaveBeenCalledWith(
      getSiteConfig('tio2-a'),
      articleIdentity[2],
    )
  })

  it('fails before preview query for a missing session, wrong site, or unknown slug', async () => {
    const missing = await loadPreviewRoutes({hasSession: false})
    await expect(missing.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(missing.getResourcePreview).not.toHaveBeenCalled()

    vi.resetModules()
    const wrongSite = await loadPreviewRoutes({siteId: 'tio2-b'})
    await expect(wrongSite.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(wrongSite.hasScopedPreviewSession).not.toHaveBeenCalled()
    expect(wrongSite.getResourcePreview).not.toHaveBeenCalled()

    vi.resetModules()
    const unknown = await loadPreviewRoutes()
    await expect(
      unknown.slug.default({params: Promise.resolve({slug: 'unknown-document'})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(unknown.hasScopedPreviewSession).not.toHaveBeenCalled()
    expect(unknown.getResourcePreview).not.toHaveBeenCalled()
  })

  it('fails closed after query for future kinds and noncanonical Article identities', async () => {
    const identity = SITE_A_RESOURCE_IDENTITIES[1]
    const future = structuredClone(canonicalFixture(identity))
    future.identity.kind = 'guide'
    const futureRuntime = await loadPreviewRoutes({resource: future})
    const props = {params: Promise.resolve({slug: identity[1]})}
    await expect(futureRuntime.slug.default(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })

    vi.resetModules()
    const noncanonical = structuredClone(canonicalFixture(identity))
    noncanonical.identity.slug = 'wrong-slug'
    const noncanonicalRuntime = await loadPreviewRoutes({resource: noncanonical})
    await expect(noncanonicalRuntime.slug.default(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('rejects schema-valid but runtime-invalid Hub and Article previews without a shell', async () => {
    const hubIdentity = SITE_A_RESOURCE_IDENTITIES[0]
    const noncanonicalHub = canonicalFixture(hubIdentity, (input) => {
      input.children = input.children.slice(0, 1)
    })
    const hubRuntime = await loadPreviewRoutes({resource: noncanonicalHub})

    await expect(hubRuntime.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(hubRuntime.getResourcePreview).toHaveBeenCalledTimes(1)

    vi.resetModules()
    const articleIdentity = SITE_A_RESOURCE_IDENTITIES[1]
    const unsafeArticle = canonicalFixture(articleIdentity, (input) => {
      input.hero.headline = '<em>Schema-valid but unsafe headline</em>'
    })
    const articleRuntime = await loadPreviewRoutes({resource: unsafeArticle})

    await expect(
      articleRuntime.slug.default({
        params: Promise.resolve({slug: articleIdentity[1]}),
      }),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(articleRuntime.getResourcePreview).toHaveBeenCalledTimes(1)
  })

  it.each([
    'not-found',
    'cross-site',
    'invalid-path',
    'contract',
  ] as const)('maps expected preview failure %s to not found', async (errorKind) => {
    const {hub} = await loadPreviewRoutes({errorKind})
    await expect(hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
  })

  it('propagates unexpected transport failures to the error boundary', async () => {
    const {hub, injectedError} = await loadPreviewRoutes({
      errorKind: 'transport',
    })
    await expect(hub.default()).rejects.toBe(injectedError)
  })
})
