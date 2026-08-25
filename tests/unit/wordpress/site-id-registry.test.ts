import {afterEach, describe, expect, it, vi} from 'vitest'

const registryExpandedSiteIds = ['tio2-a', 'tio2-b', 'tio2-c'] as const

function useExpandedSiteRegistry(): void {
  vi.doMock('@/sites', () => ({SITE_IDS: registryExpandedSiteIds}))
}

afterEach(() => {
  vi.doUnmock('@/sites')
  vi.resetModules()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('WordPress site ID registry boundaries', () => {
  it('lets the homepage DTO validate a registry-expanded owner before its source shape', async () => {
    useExpandedSiteRegistry()
    const {HomepageContractError, toHomepageDto} = await import(
      '@/lib/wordpress/homepage-dto'
    )

    expect(() => toHomepageDto({} as never, 'tio2-c', {
      linkPolicy: {siteId: 'tio2-c', isPublic: () => false} as never,
    })).toThrowError(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'identity.siteScopes',
    }))
  })

  it('accepts a preview response owned by a registry-expanded site', async () => {
    useExpandedSiteRegistry()
    vi.stubEnv('WORDPRESS_PREVIEW_URL', 'https://wordpress.test/preview')
    vi.stubEnv('WORDPRESS_PREVIEW_SECRET', 'preview-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      id: 'draft-42',
      siteId: 'tio2-c',
      path: '/draft-page',
      title: 'Draft title',
      html: '<p>Draft body</p>',
      modified: '2026-08-26T08:00:00.000Z',
      status: 'draft',
      seo: {title: 'Draft SEO title', description: 'Draft SEO description'},
    }), {status: 200})))
    const {getPreviewContentByPath} = await import('@/lib/wordpress/preview')

    await expect(
      getPreviewContentByPath('tio2-c', '/draft-page'),
    ).resolves.toMatchObject({siteId: 'tio2-c', path: '/draft-page'})
  })
})
