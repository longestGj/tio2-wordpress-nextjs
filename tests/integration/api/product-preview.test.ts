import {createHmac} from 'node:crypto'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({cookieGet: vi.fn(), getProductPagePreview: vi.fn()}))
vi.mock('next/headers', () => ({cookies: async () => ({get: mocks.cookieGet})}))
vi.mock('@/lib/wordpress/product-page-preview', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/wordpress/product-page-preview')>()),
  getProductPagePreview: mocks.getProductPagePreview,
}))
vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

import {GET} from '@/app/api/preview/route'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialTarget} from '@/lib/editorial/types'
import {toProductDetailPageDto, toProductFamilyPageDto, toProductsHubPageDto} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {ProductPageResolver} from '@/lib/products/page-types'
import {createPreviewSessionToken, previewSessionCookieName} from '@/lib/wordpress/preview-session'
import {coatingsFamilyPageInput, productsHubPageInput, tpC120ProductPageInput} from '@/tests/fixtures/products/product-pages'

const previewSecret = 'product-preview-entry-secret'
const productPaths = new Map<string, string>(SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]))
function pathFor(target: EditorialTarget) {
  return target.type === 'product' ? productPaths.get(target.id) ?? null : resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}
const resolver: ProductPageResolver = {
  editorial: (target) => {
    const path = pathFor(target)
    return path ? {...target, title: target.id, path, href: null} : null
  },
  publicHref: (path) => path === '/' ? path : null,
  ctaHref: (kind) => `mailto:contact@tio2products.com?subject=${kind}`,
}
const pages = {
  '/products': toProductsHubPageDto(structuredClone(productsHubPageInput), resolver),
  '/products/coatings': toProductFamilyPageDto(structuredClone(coatingsFamilyPageInput), resolver),
  '/products/coatings/tp-c120': toProductDetailPageDto(structuredClone(tpC120ProductPageInput), resolver),
} as const

function signedRequest(siteId: string, path: string): Request {
  const expires = Math.floor(Date.now() / 1000) + 300
  const url = new URL('http://localhost/api/preview')
  const values = {siteId, path, expires: String(expires), signature: createHmac('sha256', previewSecret).update(`${expires}\n${siteId}\n${path}`).digest('hex')}
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value)
  return new Request(url)
}

function authorize(path: keyof typeof pages, siteId = 'tio2-a') {
  mocks.cookieGet.mockImplementation((name: string) => name === previewSessionCookieName(path) ? {
    value: createPreviewSessionToken(siteId, path, Math.floor(Date.now() / 1000) + 300, previewSecret),
  } : undefined)
}

beforeEach(() => {
  vi.stubEnv('SITE_ID', 'tio2-a')
  vi.stubEnv('PREVIEW_SECRET', previewSecret)
  mocks.cookieGet.mockReturnValue(undefined)
  mocks.getProductPagePreview.mockImplementation(async (_site, path: keyof typeof pages) => pages[path])
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('Product preview entry', () => {
  it.each([
    ['/products', '/preview/products'],
    ['/products/coatings', '/preview/products/coatings'],
    ['/products/coatings/tp-c120', '/preview/products/coatings/tp-c120'],
  ] as const)('binds %s to its exact protected level and no-store cookie scope', async (path, browserPath) => {
    const response = await GET(signedRequest('tio2-a', path))
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(browserPath)
    expect(response.headers.get('cache-control')).toBe('private, no-store, max-age=0')
    expect(response.headers.get('set-cookie')).toContain(`Path=${browserPath}`)
    expect(mocks.getProductPagePreview).toHaveBeenCalledWith(expect.objectContaining({id: 'tio2-a'}), path)
  })

  it.each(['/products/tp-c120', '/products/plastics-masterbatch/tp-c120', '/products/coatings/tp-c999'])('rejects non-graph target %s without preview fetch', async (path) => {
    const response = await GET(signedRequest('tio2-a', path))
    expect(response.status).toBe(400)
    expect(mocks.getProductPagePreview).not.toHaveBeenCalled()
  })
})

describe('protected Product preview pages', () => {
  it.each([
    ['hub', '/products', '@/app/preview/products/page', undefined],
    ['family', '/products/coatings', '@/app/preview/products/[familySlug]/page', {familySlug: 'coatings'}],
    ['detail', '/products/coatings/tp-c120', '@/app/preview/products/[familySlug]/[slug]/page', {familySlug: 'coatings', slug: 'tp-c120'}],
  ] as const)('renders exact %s session no-store/noindex without canonical or JSON-LD', async (_level, path, modulePath, params) => {
    authorize(path)
    const route = await import(modulePath)
    expect(route.dynamic).toBe('force-dynamic')
    expect(route.revalidate).toBe(0)
    expect(route.fetchCache).toBe('force-no-store')
    const props = params ? {params: Promise.resolve(params)} : undefined
    const metadata = await route.generateMetadata?.(props)
    expect(metadata.robots).toEqual({index: false, follow: false})
    expect(metadata.alternates).toBeUndefined()
    const markup = renderToStaticMarkup(await route.default?.(props))
    expect(markup).toContain(`data-product-level=\"${_level}\"`)
    expect(markup).not.toContain('application/ld+json')
  })

  it('rejects wrong level, family, path and Site B sessions before preview fetch', async () => {
    authorize('/products/coatings/tp-c120')
    const family = await import('@/app/preview/products/[familySlug]/page')
    await expect(family.default({params: Promise.resolve({familySlug: 'coatings'})}))
      .rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(mocks.getProductPagePreview).not.toHaveBeenCalled()
  })
})
