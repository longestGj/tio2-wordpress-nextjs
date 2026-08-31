import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getSiteConfig} from '@/sites'
import {malaysiaProductHubSource} from '@/tests/fixtures/tio2-my-product-hub'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getMalaysiaProductHub: vi.fn(),
  getSiteProductPage: vi.fn(),
}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/components/products/product-page-renderer', () => ({
  ProductPageRenderer: () => null,
}))
vi.mock('@/lib/wordpress/product-hub-v01-queries', () => ({
  getMalaysiaProductHub: routeMocks.getMalaysiaProductHub,
}))
vi.mock('@/lib/wordpress/product-page-queries', () => ({
  getSiteProductPage: routeMocks.getSiteProductPage,
}))

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaProductHub.mockResolvedValue(
    toMalaysiaProductHubDto(malaysiaProductHubSource()),
  )
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('PRODUCT-000 route integration', () => {
  it('renders one scoped Malaysia Hub and one exact JSON-LD graph', async () => {
    const route = await import('@/app/products/page')
    const markup = renderToStaticMarkup(await route.default())

    expect(routeMocks.getMalaysiaProductHub).toHaveBeenCalledOnce()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain('Titanium Dioxide Pigment Grades for Industrial Applications')
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).toContain('"numberOfItems":14')
    expect(markup).toContain('"@type":"FAQPage"')
  })

  it('emits one normalized, route-safe canonical through Next Metadata', async () => {
    const route = await import('@/app/products/page')
    const metadata = await route.generateMetadata()
    const canonical = metadata.alternates?.canonical
    expect(typeof canonical).toBe('string')
    const url = new URL(String(canonical))
    expect(url.href).toBe('https://tio2malaysia.com/products/')
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('tio2malaysia.com')
    expect(url.pathname).toBe('/products/')
    expect(url.search + url.hash).toBe('')
    expect(metadata.robots).toMatchObject({index: false, follow: false})
  })

  it('rejects foreign scopes before either CMS query', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/products/page')
    await expect(route.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(routeMocks.getMalaysiaProductHub).not.toHaveBeenCalled()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })

  it('propagates a missing Malaysia CMS record as a server error without fallback', async () => {
    const sourceError = new GraphQLResponseError([
      {message: 'Malaysia Product Hub record is unavailable.'},
    ])
    routeMocks.getMalaysiaProductHub.mockRejectedValue(sourceError)
    const route = await import('@/app/products/page')

    await expect(route.default()).rejects.toBe(sourceError)
    expect(routeMocks.getMalaysiaProductHub).toHaveBeenCalledOnce()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })
})
