import {describe, expect, it} from 'vitest'

import {buildMalaysiaChlorideProcessJsonLd} from '@/lib/seo/product-process-chloride-jsonld'
import {getSiteConfig} from '@/sites'
import {malaysiaChlorideProcessDto} from '@/tests/fixtures/tio2-my-product-process-chloride'

describe('PRODUCT-PROC-CL JSON-LD', () => {
  it('emits one WebPage, one three-item breadcrumb and one unordered eight-item list', () => {
    const page = malaysiaChlorideProcessDto()
    const graph = buildMalaysiaChlorideProcessJsonLd(getSiteConfig('tio2-my'), page)
    const nodes = graph['@graph'] as Array<Record<string, unknown>>
    expect(nodes.map(node => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    expect(nodes[0]).toMatchObject({
      name: 'Chloride Process Titanium Dioxide',
      publisher: {'@id': 'https://tio2malaysia.com/#organization'},
      mainEntity: {'@id': 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/#chloride-grade-list'},
    })
    expect((nodes[1]!.itemListElement as unknown[])).toHaveLength(3)
    expect(nodes[2]).toMatchObject({
      '@id': 'https://tio2malaysia.com/products/chloride-process-titanium-dioxide/#chloride-grade-list',
      name: 'Explore Chloride-Process Grades',
      numberOfItems: 8,
      itemListOrder: 'https://schema.org/ItemListUnordered',
    })
    expect((nodes[2]!.itemListElement as Array<Record<string, unknown>>)).toEqual(
      page.grades.map(grade => ({
        '@type': 'ListItem', position: grade.position, name: grade.gradeNameOrModelCode,
        url: new URL(grade.cleanUrl, 'https://tio2malaysia.com').href,
      })),
    )
  })

  it('does not emit prohibited commercial, FAQ, product or hidden relationship types', () => {
    const serialized = JSON.stringify(buildMalaysiaChlorideProcessJsonLd(
      getSiteConfig('tio2-my'), malaysiaChlorideProcessDto(),
    ))
    expect(serialized).not.toMatch(/"@type":"(?:Product|Offer|FAQPage|HowTo|Review|AggregateRating)"/u)
    expect(serialized).not.toMatch(/(?:best|better|replacement) (?:grade|product)/iu)
    expect(serialized).not.toMatch(/GRADE-M|tio2-a|tio2-b|tiovar/iu)
  })
})
