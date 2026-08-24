import {describe, expect, it, vi} from 'vitest'

import {buildSitemap, SitemapIntegrityError} from '@/app/sitemap'
import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function sources(overrides: Partial<Parameters<typeof buildSitemap>[1]> = {}) {
  return {
    getHomepage: async () => toHomepageDto(makeHomepageNode(), 'tio2-a'),
    getPublicRoutes,
    getSiteTemplateProfile,
    ...overrides,
  }
}

function homepageFor(siteId: 'tio2-a' | 'tio2-b') {
  const node = makeHomepageNode()
  node.siteScopes.nodes[0] = {...node.siteScopes.nodes[0]!, slug: siteId}
  return toHomepageDto(node, siteId)
}

describe('root-only sitemap ownership', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com/'],
    ['tio2-b', 'https://tio2hub.com/'],
  ] as const)('maps only the %s inventory root to its production domain', async (siteId, url) => {
    const homepage = homepageFor(siteId)
    const sitemap = await buildSitemap(getSiteConfig(siteId), {
      ...sources(),
      getHomepage: async () => homepage,
    })

    expect(sitemap).toEqual([
      {url, lastModified: new Date('2026-08-23T08:30:00.000Z')},
    ])
    expect(new Set(sitemap.map(({url: entryUrl}) => entryUrl)).size).toBe(1)
  })

  it('fails closed when the inventory has no root route', async () => {
    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getPublicRoutes: () => [] as never,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'inventory-invalid',
    })
  })

  it('fails closed when the inventory root selects another site template', async () => {
    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getPublicRoutes: () => [{path: '/', template: 'site-b-homepage-v0.1-frozen'}] as never,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'inventory-invalid',
    })
  })

  it.each([
    ['foreign owner', {siteId: 'tio2-b' as const}],
    ['wrong path', {path: '/products' as never}],
    ['draft status', {status: 'draft'}],
    ['wrong schema', {schemaVersion: 'homepage-v9' as never}],
  ])('fails closed for a %s homepage source', async (_label, identity) => {
    const homepage = toHomepageDto(makeHomepageNode(), 'tio2-a')

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getHomepage: async () => ({
          ...homepage,
          identity: {...homepage.identity, ...identity},
        }),
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'source-invalid',
      path: '/',
    })
  })

  it('does not need a Page cursor source to build the sitemap', async () => {
    const getHomepage = vi.fn(async () =>
      toHomepageDto(makeHomepageNode(), 'tio2-a'),
    )

    await buildSitemap(getSiteConfig('tio2-a'), {
      ...sources(),
      getHomepage,
    })

    expect(getHomepage).toHaveBeenCalledOnce()
  })
})
