import {describe, expect, it} from 'vitest'

import {buildMalaysiaProductDetailJsonLd} from '@/lib/seo/product-detail-jsonld'
import {toMalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaProductDetailSource} from '@/tests/fixtures/tio2-my-product-detail'

describe('M-350 Product and Breadcrumb Schema', () => {
  it('uses only the visible scoped facts and all 15 technical rows', () => {
    const dto = toMalaysiaProductDetailDto(malaysiaProductDetailSource())
    const graph = buildMalaysiaProductDetailJsonLd(getSiteConfig('tio2-my'), dto)
    const nodes = graph['@graph'] as Array<Record<string, unknown>>
    expect(nodes.map((node) => node['@type'])).toEqual(['Product', 'BreadcrumbList'])
    expect(nodes[0]).toMatchObject({
      name: dto.seo.h1,
      sku: 'M-350',
      url: 'https://tio2malaysia.com/products/m-350/',
      category: 'Rutile titanium dioxide pigment',
    })
    expect(nodes[0]?.additionalProperty).toHaveLength(15)
    expect((nodes[0]?.additionalProperty as Array<Record<string, unknown>>)[0]).toEqual({
      '@type': 'PropertyValue',
      name: 'TiO₂ content, %',
      value: '93.5',
      description: 'Standard: ≥ 92.5; Typical Value: 93.5',
    })
    expect(nodes[1]?.itemListElement).toHaveLength(3)
  })

  it('omits commerce, comparison, origin, manufacturer and unready routes', () => {
    const serialized = JSON.stringify(buildMalaysiaProductDetailJsonLd(
      getSiteConfig('tio2-my'),
      toMalaysiaProductDetailDto(malaysiaProductDetailSource()),
    ))
    expect(serialized).not.toMatch(/Offer|AggregateRating|manufacturer|countryOfOrigin|isSimilarTo|Rubber|M-996|M-2196|request-sample|request-documents/iu)
    expect(serialized).not.toMatch(/tio2-a|tio2-b|tiovar|mytio2/iu)
  })
})
