import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  malaysiaM108ProductDetailSource,
  malaysiaM200ProductDetailSource,
  malaysiaM210ProductDetailSource,
  malaysiaM510ProductDetailSource,
  malaysiaM340ProductDetailSource,
  malaysiaM52ProductDetailSource,
  malaysiaM886ProductDetailSource,
  malaysiaM895ProductDetailSource,
  malaysiaM896ProductDetailSource,
  malaysiaM996ProductDetailSource,
  malaysiaProductDetailSource,
} from '@/tests/fixtures/tio2-my-product-detail'

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

  it('generates only the eleven approved candidates and rejects the other three Malaysia grade slugs before CMS access', async () => {
    const route = await import('@/app/products/[familySlug]/page')
    await expect(route.generateStaticParams()).resolves.toEqual([
      {familySlug: 'm-350'},
      {familySlug: 'm-510'},
      {familySlug: 'm-896'},
      {familySlug: 'm-996'},
      {familySlug: 'm-895'},
      {familySlug: 'm-200'},
      {familySlug: 'm-108'},
      {familySlug: 'm-210'},
      {familySlug: 'm-340'},
      {familySlug: 'm-886'},
      {familySlug: 'm-52'},
    ])
    for (const slug of ['m-2196', 'm-2377', 'cr-901']) {
      await expect(route.default(props(slug))).rejects.toMatchObject({
        digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
      })
    }
    expect(routeMocks.getMalaysiaProductDetail).not.toHaveBeenCalled()
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
  })

  it('loads M-896 through the same scoped route with its own metadata and Schema', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(
      toMalaysiaProductDetailDto(malaysiaM896ProductDetailSource(), 'm-896'),
    )
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-896')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-896')
    expect(routeMocks.getSiteProductPage).not.toHaveBeenCalled()
    expect(markup).toContain('M-896 Titanium Dioxide for Industrial Coating Evaluation')
    expect(markup).toContain('data-label="Value">92%</td>')
    expect(markup).toContain('"value":"92%"')
    expect(markup).not.toContain('"value":"XRF"')
    expect((await route.generateMetadata(props('m-896'))).alternates?.canonical).toBe(
      'https://tio2malaysia.com/products/m-896/',
    )
  })

  it('loads M-895 through the same scoped route with its distinct content and metadata', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(
      toMalaysiaProductDetailDto(malaysiaM895ProductDetailSource(), 'm-895'),
    )
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-895')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-895')
    expect(markup).toContain('M-895 Titanium Dioxide for Architectural and Industrial Coatings')
    expect(markup).toContain('data-label="Typical value">94%</td>')
    expect((await route.generateMetadata(props('m-895'))).alternates?.canonical).toBe(
      'https://tio2malaysia.com/products/m-895/',
    )
  })

  it('loads M-996 through the same scoped route with source values, methods and metadata', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(
      toMalaysiaProductDetailDto(malaysiaM996ProductDetailSource(), 'm-996'),
    )
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-996')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-996')
    expect(markup).toContain('M-996 Titanium Dioxide for Industrial, Powder and Architectural Coatings')
    expect(markup).toContain('data-label="Value">95%</td>')
    expect(markup).toContain('data-label="Test method">XRF</td>')
    expect(markup).toContain('*Moisture is measured within 48 hours of production.')
    expect(markup).toContain('"value":"95%"')
    expect(markup).not.toContain('"value":"XRF"')
    expect((await route.generateMetadata(props('m-996'))).alternates?.canonical).toBe(
      'https://tio2malaysia.com/products/m-996/',
    )
  })

  it('loads M-340 through the same scoped route with meaningful treatment Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(
      toMalaysiaProductDetailDto(malaysiaM340ProductDetailSource(), 'm-340'),
    )
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-340')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-340')
    expect(markup).toContain('M-340 Titanium Dioxide for Plastics and Masterbatch Evaluation')
    expect(markup).toContain('data-label="Standard">Al₂O₃</td>')
    expect(markup).toContain('"value":"Al₂O₃"')
    expect(markup).toContain('"value":"Yes"')
    expect(markup).not.toContain('"value":"--"')
    expect((await route.generateMetadata(props('m-340'))).alternates?.canonical).toBe(
      'https://tio2malaysia.com/products/m-340/',
    )
  })

  it('loads M-886 through the same scoped route with ten visible Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(toMalaysiaProductDetailDto(malaysiaM886ProductDetailSource(), 'm-886'))
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-886')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-886')
    expect(markup).toContain('M-886 Titanium Dioxide for Plastics and Masterbatch Evaluation')
    expect(markup).toContain('data-label="Typical value">0.4% max</td>')
    expect(markup).not.toMatch(/Footwear|Coatings|11\/2024/iu)
    expect((await route.generateMetadata(props('m-886'))).alternates?.canonical).toBe('https://tio2malaysia.com/products/m-886/')
  })

  it('loads M-52 through the same scoped route with eleven visible Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(toMalaysiaProductDetailDto(malaysiaM52ProductDetailSource(), 'm-52'))
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-52')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-52')
    expect(markup).toContain('M-52 Titanium Dioxide for Printing Inks and Coatings Evaluation')
    expect(markup).toContain('data-label="Typical value">0.3% max</td>')
    expect(markup).toContain('Sulfate process')
    expect(markup).not.toMatch(/Plastics|Masterbatch|Paper|Specialty/iu)
    expect((await route.generateMetadata(props('m-52'))).alternates?.canonical).toBe('https://tio2malaysia.com/products/m-52/')
  })

  it('loads M-108 through the same scoped route with ten visible Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(toMalaysiaProductDetailDto(malaysiaM108ProductDetailSource(), 'm-108'))
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-108')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-108')
    expect(markup).toContain('M-108 Titanium Dioxide for Plastics and Masterbatch Evaluation')
    expect(markup).toContain('data-label="Typical value">0.4% max</td>')
    expect(markup).toContain('Sulfate process')
    expect(markup).not.toMatch(/2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials/iu)
    expect((await route.generateMetadata(props('m-108'))).alternates?.canonical).toBe('https://tio2malaysia.com/products/m-108/')
  })

  it('loads M-210 through the same scoped route with twelve visible Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(toMalaysiaProductDetailDto(malaysiaM210ProductDetailSource(), 'm-210'))
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-210')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-210')
    expect(markup).toContain('M-210 Titanium Dioxide for Masterbatch and Plastics Evaluation')
    expect(markup).toContain('data-label="Typical value">96.5</td>')
    expect(markup).not.toContain('data-label="Test method"')
    expect(markup).toContain('Chloride process')
    expect(markup).not.toMatch(/FDA|food.contact|Rubber|Coatings|Printing Inks|Paper|Specialty Materials/iu)
    expect((await route.generateMetadata(props('m-210'))).alternates?.canonical).toBe('https://tio2malaysia.com/products/m-210/')
  })

  it('loads M-200 through the same scoped route with visible V1 2026 and twelve Schema values', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(toMalaysiaProductDetailDto(malaysiaM200ProductDetailSource(), 'm-200'))
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-200')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-200')
    expect(markup).toContain('M-200 Titanium Dioxide for Exterior Plastics and Masterbatch Evaluation')
    expect(markup).toContain('M-200 TDS · V1 2026')
    expect(markup).toContain('data-label="Typical value">92.5</td>')
    expect(markup).not.toContain('data-label="Test method"')
    expect(markup).toContain('Chloride process')
    expect(markup).not.toMatch(/CR-200|2024 V3|TIOVAR|Coatings|Printing Inks|Paper|Specialty Materials/iu)
    expect((await route.generateMetadata(props('m-200'))).alternates?.canonical).toBe('https://tio2malaysia.com/products/m-200/')
  })

  it('loads and renders the distinct M-510 candidate through the same route and template', async () => {
    routeMocks.getMalaysiaProductDetail.mockResolvedValue(
      toMalaysiaProductDetailDto(malaysiaM510ProductDetailSource(), 'm-510'),
    )
    const route = await import('@/app/products/[familySlug]/page')
    const markup = renderToStaticMarkup(await route.default(props('m-510')))
    expect(routeMocks.getMalaysiaProductDetail).toHaveBeenCalledWith('m-510')
    expect(markup).toContain('M-510 Titanium Dioxide for Coating Evaluation')
    expect(markup).not.toContain('M-350 is a general-grade')
    expect(markup).not.toContain('data-module="related-grades"')
    expect((await route.generateMetadata(props('m-510'))).alternates?.canonical).toBe(
      'https://tio2malaysia.com/products/m-510/',
    )
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
