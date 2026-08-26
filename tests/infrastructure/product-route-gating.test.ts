import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {toProductPageDto} from '@/lib/products/dto'
import type {ProductPageDto} from '@/lib/products/types'
import {getSiteConfig} from '@/sites'
import * as sites from '@/sites'
import {
  getApprovedProductSlugs,
  parsePublicRouteInventory,
} from '@/sites/public-routes'
import type {PublicRouteDefinition} from '@/sites/types'
import {validProductPageInput} from '@/tests/fixtures/product-page'

describe('Product route inventory gating', () => {
  it('exposes the Product route policy through the site boundary', () => {
    expect(sites.PRODUCT_TEMPLATE_KEY).toBe('site-a-product-v0.1')
    expect(sites.getApprovedProductSlugs).toBe(getApprovedProductSlugs)
  })

  it('keeps the current production inventory empty for both Product sites', () => {
    expect(getApprovedProductSlugs('tio2-a')).toEqual([])
    expect(getApprovedProductSlugs('tio2-b')).toEqual([])
  })

  it('extracts only canonical Product slugs from an injected typed Site A inventory', () => {
    const routes = [
      {path: '/', template: 'site-a-homepage-editorial-v0.2'},
      {path: '/products/tp-z911', template: 'site-a-product-v0.1'},
      {path: '/products/tp-z912', template: 'site-a-product-v0.1'},
    ] as const satisfies readonly PublicRouteDefinition[]

    expect(getApprovedProductSlugs('tio2-a', routes)).toEqual([
      'tp-z911',
      'tp-z912',
    ])
    expect(getApprovedProductSlugs('tio2-b', routes)).toEqual([])
  })

  it('fails closed for malformed Product paths in an injected inventory', () => {
    const routes = [
      {path: '/products/TP-Z911', template: 'site-a-product-v0.1'},
      {path: '/products/tp-z911/extra', template: 'site-a-product-v0.1'},
      {path: '/products/not-a-grade', template: 'site-a-product-v0.1'},
    ] as const satisfies readonly PublicRouteDefinition[]

    expect(getApprovedProductSlugs('tio2-a', routes)).toEqual([])
  })

  it('does not activate a future Product inventory parser version', () => {
    expect(() => parsePublicRouteInventory({
      version: 'product-routes-v0.2',
      sites: {
        'tio2-a': {
          expectedPublicUrls: 2,
          routes: [
            {path: '/', template: 'site-a-homepage-editorial-v0.2'},
            {path: '/products/tp-z911', template: 'site-a-product-v0.1'},
          ],
        },
        'tio2-b': {
          expectedPublicUrls: 1,
          routes: [
            {path: '/', template: 'site-b-homepage-v0.1-frozen'},
          ],
        },
      },
    })).toThrow('Invalid public route inventory')
  })
})

interface RouteScenario {
  readonly siteId?: 'tio2-a' | 'tio2-b'
  readonly approvedSlugs?: readonly string[]
  readonly product?: ProductPageDto | null
}

async function loadProductRoute({
  siteId = 'tio2-a',
  approvedSlugs,
  product = null,
}: RouteScenario = {}) {
  const site = getSiteConfig(siteId)
  const getSiteProduct = vi.fn(async () => product)

  vi.doMock('@/lib/sites/current-site', () => ({
    getCurrentSite: () => site,
  }))
  vi.doMock('@/lib/wordpress/product-queries', async () => {
    const actual = await vi.importActual<
      typeof import('@/lib/wordpress/product-queries')
    >('@/lib/wordpress/product-queries')
    return {...actual, getSiteProduct}
  })
  if (approvedSlugs !== undefined) {
    vi.doMock('@/sites/public-routes', async () => {
      const actual = await vi.importActual<
        typeof import('@/sites/public-routes')
      >('@/sites/public-routes')
      return {
        ...actual,
        getApprovedProductSlugs: () => approvedSlugs,
      }
    })
  }

  const route = await import('@/app/products/[slug]/page')
  return {getSiteProduct, route}
}

afterEach(() => {
  vi.doUnmock('@/lib/sites/current-site')
  vi.doUnmock('@/lib/wordpress/product-queries')
  vi.doUnmock('@/sites/public-routes')
  vi.clearAllMocks()
  vi.resetModules()
})

describe('canonical Product route', () => {
  it('uses one-hour revalidation, runtime params, and no forced dynamic rendering', async () => {
    const {route} = await loadProductRoute()

    expect(route.revalidate).toBe(3600)
    expect(route.dynamicParams).toBe(true)
    expect(Reflect.has(route, 'dynamic')).toBe(false)
  })

  it('generates no Product params from the current inventory', async () => {
    const {route} = await loadProductRoute()

    expect(await route.generateStaticParams()).toEqual([])
  })

  it('maps injected approved Product slugs to static params', async () => {
    const {route} = await loadProductRoute({
      approvedSlugs: ['tp-z911', 'tp-z912'],
    })

    expect(await route.generateStaticParams()).toEqual([
      {slug: 'tp-z911'},
      {slug: 'tp-z912'},
    ])
  })

  it('returns 404 for the current anonymous Product URL before querying WordPress', async () => {
    const {getSiteProduct, route} = await loadProductRoute()
    const props = {params: Promise.resolve({slug: 'tp-z911'})}

    await expect(route.default(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(route.generateMetadata(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getSiteProduct).not.toHaveBeenCalled()
  })

  it('rejects Site B before querying WordPress even with an injected Product slug', async () => {
    const {getSiteProduct, route} = await loadProductRoute({
      siteId: 'tio2-b',
      approvedSlugs: ['tp-z911'],
    })
    const props = {params: Promise.resolve({slug: 'tp-z911'})}

    await expect(route.default(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(route.generateMetadata(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getSiteProduct).not.toHaveBeenCalled()
  })

  it('renders the shared Product page with canonical metadata and Product JSON-LD when approved', async () => {
    const product = toProductPageDto(validProductPageInput)
    const {route} = await loadProductRoute({
      approvedSlugs: ['tp-z911'],
      product,
    })
    const props = {params: Promise.resolve({slug: 'tp-z911'})}

    const markup = renderToStaticMarkup(await route.default(props))
    const metadata = await route.generateMetadata(props)

    expect(markup).toContain('<main data-site-id="tio2-a">')
    expect(markup).toContain('data-product-id="TP-Z911"')
    expect(markup).toContain(
      '<h1 id="product-hero-heading">TIOVAR TP-Z911 Rutile Titanium Dioxide</h1>',
    )
    expect(markup).toContain('<script type="application/ld+json">')
    expect(markup).toContain('"@type":"Product"')
    expect(markup).toContain(
      'https://tio2products.com/products/tp-z911#product',
    )
    expect(metadata).toMatchObject({
      title: 'TP-Z911 Rutile Titanium Dioxide | TIOVAR',
      alternates: {
        canonical: 'https://tio2products.com/products/tp-z911',
      },
      openGraph: {
        url: 'https://tio2products.com/products/tp-z911',
      },
    })
  })

  it('returns 404 when an approved Product is missing from WordPress', async () => {
    const {getSiteProduct, route} = await loadProductRoute({
      approvedSlugs: ['tp-z911'],
      product: null,
    })
    const props = {params: Promise.resolve({slug: 'tp-z911'})}

    await expect(route.default(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    await expect(route.generateMetadata(props)).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(getSiteProduct).toHaveBeenCalledTimes(2)
  })
})
