import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaProductDetailSource} from '@/tests/fixtures/tio2-my-product-detail'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getMalaysiaProductDetail: vi.fn(),
  getSiteProductPage: vi.fn(),
}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/components/products/product-page-renderer', () => ({ProductPageRenderer: () => null}))
vi.mock('@/lib/wordpress/product-detail-v01-queries', () => ({
  getMalaysiaProductDetail: routeMocks.getMalaysiaProductDetail,
}))
vi.mock('@/lib/wordpress/product-page-queries', () => ({getSiteProductPage: routeMocks.getSiteProductPage}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaProductDetail.mockResolvedValue(
    toMalaysiaProductDetailDto(malaysiaProductDetailSource()),
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

function props(familySlug: string) {
  return {params: Promise.resolve({familySlug})}
}

describe('M-350 route integration', () => {
  it('renders the exact scoped candidate and one two-node JSON-LD graph', async () => {
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-350')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-350')
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain('M-350 Rutile Titanium Dioxide Pigment')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).toContain('"@type":"Product"')
    expect(markup).toContain('"@type":"BreadcrumbList"')
  })

  it('emits one exact canonical through Next Metadata', async () => {
    const route = await import('@/app/products/[familySlug]/page')
    const metadata = await route.generateMetadata(props('m-350'))
    const canonical = metadata.alternates?.canonical
    expect(canonical).toBe('https://tio2malaysia.com/products/m-350/')
    const url = new URL(String(canonical))
    expect(url).toMatchObject({protocol: 'https:', hostname: 'tio2malaysia.com', pathname: '/products/m-350/'})
    expect(url.search + url.hash).toBe('')
    expect(metadata.robots).toMatchObject({index: false, follow: false})
  })

  it('generates only M-350 and rejects all other Malaysia grade slugs before CMS access', async () => {
    const route = await import('@/app/products/[familySlug]/page')
    await expect(route.generateStaticParams()).resolves.toEqual([{familySlug: 'm-350'}])
    for (const slug of ['m-510', 'm-896', 'm-996', 'm-2196', 'cr-901']) {
      await expect(route.default(props(slug))).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
    }
    expect(routeMocks.getMalaysiaProductDetail).not.toHaveBeenCalled()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })

  it('rejects foreign scopes before either CMS query', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/products/[familySlug]/page')
    await expect(route.default(props('m-350'))).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(routeMocks.getMalaysiaProductDetail).not.toHaveBeenCalled()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })

  it('propagates missing scoped CMS data as a server error without fallback', async () => {
    const sourceError = new GraphQLResponseError([{message: 'Malaysia M-350 record is unavailable.'}])
    routeMocks.getMalaysiaProductDetail.mockRejectedValue(sourceError)
    const route = await import('@/app/products/[familySlug]/page')
    await expect(route.default(props('m-350'))).rejects.toBe(sourceError)
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledOnce()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })
})
