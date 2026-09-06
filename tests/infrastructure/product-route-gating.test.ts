import {afterEach, describe, expect, it, vi} from 'vitest'

import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {getSiteConfig} from '@/sites'
import * as sites from '@/sites'
import {getApprovedProductPagePaths, parsePublicRouteInventory} from '@/sites/public-routes'
import type {PublicRouteDefinition} from '@/sites/types'

describe('family-aware Product route inventory', () => {
  it('exposes the exact-path Product policy through the site boundary', () => {
    expect(sites.getApprovedProductPagePaths).toBe(getApprovedProductPagePaths)
  })

  it('keeps all real Product routes closed for both sites', () => {
    expect(getApprovedProductPagePaths('tio2-a')).toEqual([])
    expect(getApprovedProductPagePaths('tio2-b')).toEqual([])
  })

  it('extracts only exact graph paths from a future injected Site A inventory', () => {
    const routes = [
      {path: '/', template: 'site-a-homepage-brand-v0.3'},
      {path: '/products', template: 'site-a-product-v0.1'},
      {path: '/products/coatings', template: 'site-a-product-v0.1'},
      {path: '/products/coatings/tp-c120', template: 'site-a-product-v0.1'},
      {path: '/products/tp-c120', template: 'site-a-product-v0.1'},
      {path: '/products/coatings/tp-c999', template: 'site-a-product-v0.1'},
    ] as const satisfies readonly PublicRouteDefinition[]
    expect(getApprovedProductPagePaths('tio2-a', routes)).toEqual([
      '/products', '/products/coatings', '/products/coatings/tp-c120',
    ])
    expect(getApprovedProductPagePaths('tio2-b', routes)).toEqual([])
  })

  it('does not activate a future inventory parser version', () => {
    expect(() => parsePublicRouteInventory({version: 'product-routes-v0.2', sites: {}}))
      .toThrow('Invalid public route inventory')
  })
})

const routePolicy = {siteId: 'tio2-a' as 'tio2-a' | 'tio2-b', approved: new Set<string>()}

async function loadRoutes() {
  const getSiteProductPage = vi.fn()
  vi.doMock('next/font/google', () => ({
    Source_Sans_3: () => ({variable: 'source-sans-font'}),
    Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
  }))
  vi.doMock('@/lib/sites/current-site', () => ({getCurrentSite: () => getSiteConfig(routePolicy.siteId)}))
  vi.doMock('@/lib/wordpress/product-page-queries', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/wordpress/product-page-queries')>()),
    getSiteProductPage,
  }))
  vi.doMock('@/sites/public-routes', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/sites/public-routes')>()),
    isPublicRoute: (_siteId: string, path: string) => routePolicy.approved.has(path),
    getApprovedProductPagePaths: () => [...routePolicy.approved],
  }))
  return {
    getSiteProductPage,
    hub: await import('@/app/products/page'),
    family: await import('@/app/products/[familySlug]/page'),
    detail: await import('@/app/products/[familySlug]/[slug]/page'),
  }
}

afterEach(() => {
  routePolicy.siteId = 'tio2-a'
  routePolicy.approved.clear()
  vi.doUnmock('@/lib/sites/current-site')
  vi.doUnmock('@/lib/wordpress/product-page-queries')
  vi.doUnmock('@/sites/public-routes')
  vi.doUnmock('next/font/google')
  vi.clearAllMocks()
  vi.resetModules()
})

describe('closed three-level Product routes', () => {
  it('uses one-hour public caching while generating no real static params', async () => {
    const {hub, family, detail} = await loadRoutes()
    expect(hub.revalidate).toBe(3600)
    expect(family.revalidate).toBe(3600)
    expect(detail.revalidate).toBe(3600)
    expect(family.dynamicParams).toBe(false)
    expect(detail.dynamicParams).toBe(false)
    expect(await family.generateStaticParams()).toEqual([])
    expect(await detail.generateStaticParams()).toEqual([])
  })

  it('rejects all 34 exact identities before any WordPress query', async () => {
    const {getSiteProductPage, hub, family, detail} = await loadRoutes()
    for (const identity of SITE_A_PRODUCT_IDENTITIES) {
      const call = identity.level === 'hub'
        ? hub.default()
        : identity.level === 'family'
          ? family.default({params: Promise.resolve({familySlug: identity.familySlug!})})
          : detail.default({params: Promise.resolve({familySlug: identity.familySlug!, slug: identity.productSlug!})})
      await expect(call).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    }
    expect(SITE_A_PRODUCT_IDENTITIES).toHaveLength(34)
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })

  it('rejects legacy and family-mismatched paths before query', async () => {
    const {getSiteProductPage, family, detail} = await loadRoutes()
    await expect(family.default({params: Promise.resolve({familySlug: 'tp-c120'})}))
      .rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    await expect(detail.default({params: Promise.resolve({familySlug: 'plastics-masterbatch', slug: 'tp-c120'})}))
      .rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })

  it('rejects Site B before query even if a path is injected as approved', async () => {
    routePolicy.siteId = 'tio2-b'
    routePolicy.approved.add('/products/coatings/tp-c120')
    const {getSiteProductPage, detail} = await loadRoutes()
    await expect(detail.default({params: Promise.resolve({familySlug: 'coatings', slug: 'tp-c120'})}))
      .rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(getSiteProductPage).not.toHaveBeenCalled()
  })
})
