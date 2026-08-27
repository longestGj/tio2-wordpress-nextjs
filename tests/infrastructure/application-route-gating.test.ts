import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {toApplicationPageDto} from '@/lib/applications/dto'
import {
  SITE_A_APPLICATION_IDENTITIES,
} from '@/lib/applications/content-manifest'
import type {ApplicationPageInput} from '@/lib/applications/schema'
import type {ApplicationPageDto} from '@/lib/applications/types'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {getSiteConfig} from '@/sites'
import {applicationDetailInput, applicationHubInput} from '@/tests/fixtures/editorial/application-pages'

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
  identity: (typeof SITE_A_APPLICATION_IDENTITIES)[number],
): ApplicationPageDto {
  const [id, slug, path, level, family, parentId] = identity
  const base = level === 'hub' ? applicationHubInput : applicationDetailInput
  const input = structuredClone(base) as unknown as ApplicationPageInput
  input.relationships = input.relationships.map((target) =>
    target.type === 'product' ? {...target, id: 'TP-P100'} : target,
  )
  return toApplicationPageDto(
    {
      ...input,
      identity: {
        ...input.identity,
        id,
        slug,
        path,
        level,
        family,
        parentId,
      },
      children: [],
    },
    resolveTarget,
  )
}

interface PublicScenario {
  readonly siteId?: 'tio2-a' | 'tio2-b'
  readonly approvedPaths?: readonly string[]
  readonly application?: ApplicationPageDto | null
}

async function loadPublicRoutes({
  siteId = 'tio2-a',
  approvedPaths = [],
  application = null,
}: PublicScenario = {}) {
  const site = getSiteConfig(siteId)
  const calls: string[] = []
  const isPublicRoute = vi.fn((_siteId: string, path: string) => {
    calls.push(`gate:${path}`)
    return approvedPaths.includes(path)
  })
  const getSiteApplication = vi.fn(async (_site: unknown, path: string) => {
    calls.push(`query:${path}`)
    return application
  })

  vi.doMock('@/lib/sites/current-site', () => ({getCurrentSite: () => site}))
  vi.doMock('@/sites/public-routes', async () => {
    const actual = await vi.importActual<typeof import('@/sites/public-routes')>(
      '@/sites/public-routes',
    )
    return {...actual, isPublicRoute}
  })
  vi.doMock('@/lib/wordpress/application-queries', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/application-queries')
    >('@/lib/wordpress/application-queries')
    return {...actual, getSiteApplication}
  })

  const hub = await import('@/app/applications/page')
  const slug = await import('@/app/applications/[slug]/page')
  return {calls, getSiteApplication, hub, isPublicRoute, slug}
}

interface PreviewScenario {
  readonly siteId?: 'tio2-a' | 'tio2-b'
  readonly hasSession?: boolean
  readonly application?: ApplicationPageDto
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
  application = canonicalFixture(SITE_A_APPLICATION_IDENTITIES[0]),
  errorKind,
}: PreviewScenario = {}) {
  const site = getSiteConfig(siteId)
  let injectedError: Error | undefined
  const hasScopedPreviewSession = vi.fn(async () => hasSession)
  const getApplicationPreview = vi.fn(async () => {
    if (injectedError) throw injectedError
    return application
  })

  vi.doMock('@/lib/sites/current-site', () => ({getCurrentSite: () => site}))
  vi.doMock('@/lib/wordpress/preview-session', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/preview-session')
    >('@/lib/wordpress/preview-session')
    return {...actual, hasScopedPreviewSession}
  })
  vi.doMock('@/lib/wordpress/application-preview', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/application-preview')
    >('@/lib/wordpress/application-preview')
    return {...actual, getApplicationPreview}
  })

  const hub = await import('@/app/preview/applications/page')
  const slug = await import('@/app/preview/applications/[slug]/page')
  if (errorKind) {
    const preview = await import('@/lib/wordpress/application-preview')
    const dto = await import('@/lib/applications/dto')
    const wordpressTypes = await import('@/lib/wordpress/types')
    const previewTransport = await import('@/lib/wordpress/preview')
    injectedError =
      errorKind === 'not-found'
        ? new preview.ApplicationPreviewNotFoundError()
        : errorKind === 'cross-site'
          ? new wordpressTypes.CrossSiteContentError('tio2-a', ['tio2-b'])
          : errorKind === 'invalid-path'
            ? new wordpressTypes.InvalidContentPathError('/applications/wrong')
            : errorKind === 'contract'
              ? new dto.ApplicationContractError(['identity'])
              : new previewTransport.PreviewTransportError(
                  'synthetic transport failure',
                )
  }
  return {
    getApplicationPreview,
    hasScopedPreviewSession,
    hub,
    injectedError,
    slug,
  }
}

afterEach(() => {
  vi.doUnmock('@/lib/sites/current-site')
  vi.doUnmock('@/sites/public-routes')
  vi.doUnmock('@/lib/wordpress/application-queries')
  vi.doUnmock('@/lib/wordpress/preview-session')
  vi.doUnmock('@/lib/wordpress/application-preview')
  vi.clearAllMocks()
  vi.resetModules()
})

describe('public Application route gates', () => {
  it('uses one-hour revalidation and generates no private Application params', async () => {
    const {hub, slug} = await loadPublicRoutes()

    expect(hub.revalidate).toBe(3600)
    expect(slug.revalidate).toBe(3600)
    expect(slug.dynamicParams).toBe(true)
    expect(await slug.generateStaticParams()).toEqual([])
  })

  it('returns not found for all 28 current canonical identities before any WordPress query', async () => {
    const {calls, getSiteApplication, hub, isPublicRoute, slug} =
      await loadPublicRoutes()

    for (const identity of SITE_A_APPLICATION_IDENTITIES) {
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
      SITE_A_APPLICATION_IDENTITIES.length * 2,
    )
    expect(getSiteApplication).not.toHaveBeenCalled()
    expect(calls.every((call) => call.startsWith('gate:'))).toBe(true)
  })

  it('still gates before querying when a route is separately approved', async () => {
    const identity = SITE_A_APPLICATION_IDENTITIES[1]
    const application = canonicalFixture(identity)
    const {calls, slug} = await loadPublicRoutes({
      approvedPaths: [identity[2]],
      application,
    })
    const props = {params: Promise.resolve({slug: identity[1]})}

    const markup = renderToStaticMarkup(await slug.default(props))
    expect(markup).toContain('<main data-site-id="tio2-a">')
    expect(markup).toContain('data-application-mode="category"')
    expect(calls.slice(0, 2)).toEqual([
      `gate:${identity[2]}`,
      `query:${identity[2]}`,
    ])
  })
})

describe('protected Application previews', () => {
  it('renders both Hub and exact non-Hub drafts behind path-bound sessions', async () => {
    const hubApplication = canonicalFixture(SITE_A_APPLICATION_IDENTITIES[0])
    const hubRuntime = await loadPreviewRoutes({application: hubApplication})
    const hubMarkup = renderToStaticMarkup(await hubRuntime.hub.default())

    expect(hubMarkup).toContain('data-application-mode="hub"')
    expect(hubRuntime.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      '/applications',
    )
    expect(hubRuntime.getApplicationPreview).toHaveBeenCalledWith(
      getSiteConfig('tio2-a'),
      '/applications',
    )

    vi.resetModules()
    const detailIdentity = SITE_A_APPLICATION_IDENTITIES[7]
    const detailApplication = canonicalFixture(detailIdentity)
    const detailRuntime = await loadPreviewRoutes({application: detailApplication})
    const detailMarkup = renderToStaticMarkup(
      await detailRuntime.slug.default({
        params: Promise.resolve({slug: detailIdentity[1]}),
      }),
    )

    expect(detailMarkup).toContain('data-application-mode="detail"')
    expect(detailRuntime.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      detailIdentity[2],
    )
    expect(detailRuntime.getApplicationPreview).toHaveBeenCalledWith(
      getSiteConfig('tio2-a'),
      detailIdentity[2],
    )
  })

  it('fails closed before preview query for a missing session, wrong site, or unknown slug', async () => {
    const missing = await loadPreviewRoutes({hasSession: false})
    await expect(missing.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(missing.getApplicationPreview).not.toHaveBeenCalled()

    vi.resetModules()
    const wrongSite = await loadPreviewRoutes({siteId: 'tio2-b'})
    await expect(wrongSite.hub.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(wrongSite.hasScopedPreviewSession).not.toHaveBeenCalled()
    expect(wrongSite.getApplicationPreview).not.toHaveBeenCalled()

    vi.resetModules()
    const unknown = await loadPreviewRoutes()
    await expect(
      unknown.slug.default({params: Promise.resolve({slug: 'unknown'})}),
    ).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(unknown.hasScopedPreviewSession).not.toHaveBeenCalled()
    expect(unknown.getApplicationPreview).not.toHaveBeenCalled()
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

  it('propagates unexpected preview transport failures to the error boundary', async () => {
    const {hub, injectedError} = await loadPreviewRoutes({
      errorKind: 'transport',
    })

    await expect(hub.default()).rejects.toBe(injectedError)
  })
})
