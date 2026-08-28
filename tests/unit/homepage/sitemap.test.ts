import {describe, expect, it, vi} from 'vitest'

import {buildSitemap, SitemapIntegrityError} from '@/app/sitemap'
import {toProductPageDto} from '@/lib/products/dto'
import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {AnyHomepageDto} from '@/lib/wordpress/homepage-types'
import {toSiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import {PRODUCT_TEMPLATE_KEY} from '@/sites/types'
import type {PublicRouteDefinition} from '@/sites/types'
import {validProductPageInput} from '@/tests/fixtures/product-page'
import {
  makeHomepageNode,
} from '@/tests/mocks/handlers'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'

type SitemapSourceOverrides = Partial<
  NonNullable<Parameters<typeof buildSitemap>[1]>
>

function sources(overrides: SitemapSourceOverrides = {}) {
  return {
    getHomepage: async () => homepageFor('tio2-a'),
    getSiteProduct: async () => null,
    getPublicRoutes,
    getSiteTemplateProfile,
    ...overrides,
  }
}

function homepageFor(siteId: 'tio2-a' | 'tio2-b'): AnyHomepageDto {
  if (siteId === 'tio2-a') {
    return toSiteABrandHomepageDto(makeSiteABrandHomepageNode())
  }

  const node = makeHomepageNode(siteId)
  return toHomepageDto(node, siteId, {
    linkPolicy: getHomepageLinkPolicy(siteId),
  })
}

describe('typed sitemap ownership', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com/', '2026-08-28T10:00:00.000Z'],
    ['tio2-b', 'https://tio2hub.com/', '2026-08-23T08:30:00.000Z'],
  ] as const)('maps only the %s inventory root to its production domain', async (siteId, url, modified) => {
    const homepage = homepageFor(siteId)
    const sitemap = await buildSitemap(getSiteConfig(siteId), {
      ...sources(),
      getHomepage: async () => homepage,
    })

    expect(sitemap).toEqual([
      {url, lastModified: new Date(modified)},
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
    const homepage = homepageFor('tio2-a')

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getHomepage: async () =>
          ({
            ...homepage,
            identity: {...homepage.identity, ...identity},
          }) as never,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'source-invalid',
      path: '/',
    })
  })

  it('does not need a Page cursor source to build the sitemap', async () => {
    const getHomepage = vi.fn(async () => homepageFor('tio2-a'))

    await buildSitemap(getSiteConfig('tio2-a'), {
      ...sources(),
      getHomepage,
    })

    expect(getHomepage).toHaveBeenCalledOnce()
  })

  it('maps an injected approved Product route from the validated Product source', async () => {
    const product = toProductPageDto(validProductPageInput)
    const routes: readonly PublicRouteDefinition[] = [
      {path: '/', template: 'site-a-homepage-brand-v0.3'},
      {
        path: '/products/tp-z911',
        template: PRODUCT_TEMPLATE_KEY,
      },
    ]

    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getPublicRoutes: () => routes,
        getSiteProduct: async () => product,
      }),
    ).resolves.toEqual([
      {
        url: 'https://tio2products.com/',
        lastModified: new Date('2026-08-28T10:00:00.000Z'),
      },
      {
        url: 'https://tio2products.com/products/tp-z911',
        lastModified: new Date('2026-08-26T08:30:00.000Z'),
      },
    ])
  })

  it('fails closed when an approved Product is missing from WordPress', async () => {
    await expect(
      buildSitemap(getSiteConfig('tio2-a'), {
        ...sources(),
        getPublicRoutes: () => [
          {path: '/', template: 'site-a-homepage-brand-v0.3'},
          {
            path: '/products/tp-z911',
            template: PRODUCT_TEMPLATE_KEY,
          },
        ],
        getSiteProduct: async () => null,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'source-invalid',
      path: '/products/tp-z911',
    })
  })

  it('rejects a Site B Product inventory before reading Product sources', async () => {
    const getHomepage = vi.fn(async () => homepageFor('tio2-b'))
    const getProduct = vi.fn(async () => toProductPageDto(validProductPageInput))

    await expect(
      buildSitemap(getSiteConfig('tio2-b'), {
        ...sources(),
        getHomepage,
        getPublicRoutes: () => [
          {path: '/', template: 'site-b-homepage-v0.1-frozen'},
          {
            path: '/products/tp-z911',
            template: PRODUCT_TEMPLATE_KEY,
          },
        ],
        getSiteProduct: getProduct,
      }),
    ).rejects.toMatchObject({
      name: SitemapIntegrityError.name,
      reason: 'inventory-invalid',
      path: '/products/tp-z911',
    })
    expect(getHomepage).not.toHaveBeenCalled()
    expect(getProduct).not.toHaveBeenCalled()
  })
})
