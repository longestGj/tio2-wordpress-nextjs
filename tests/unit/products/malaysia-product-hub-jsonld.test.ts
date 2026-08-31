import {describe, expect, it} from 'vitest'

import {buildMalaysiaProductHubJsonLd} from '@/lib/seo/product-hub-jsonld'
import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaProductHubSource} from '@/tests/fixtures/tio2-my-product-hub'

describe('PRODUCT-000 JSON-LD', () => {
  it('builds CollectionPage, BreadcrumbList, 14-item ItemList and exact FAQPage', () => {
    const hub = toMalaysiaProductHubDto(malaysiaProductHubSource())
    const graph = buildMalaysiaProductHubJsonLd(getSiteConfig('tio2-my'), hub)
    const nodes = graph['@graph'] as Record<string, unknown>[]
    expect(nodes.map((node) => node['@type'])).toEqual([
      'CollectionPage', 'BreadcrumbList', 'ItemList', 'FAQPage',
    ])
    const itemList = nodes[2]
    const items = itemList.itemListElement as Array<Record<string, unknown>>
    expect(items).toHaveLength(14)
    expect(items.map((item) => item.position)).toEqual(Array.from({length: 14}, (_, index) => index + 1))
    const visible = hub.directory.groups.flatMap((group) => group.grades)
    expect(items.map((entry) => (entry.item as Record<string, unknown>).description)).toEqual(
      visible.map((grade) => grade.summary),
    )
    const faq = nodes[3].mainEntity as Array<Record<string, unknown>>
    expect(faq.map((item) => item.name)).toEqual(hub.buyerQuestions.map((item) => item.question))
    expect(faq.map((item) => (item.acceptedAnswer as Record<string, unknown>).text)).toEqual(
      hub.buyerQuestions.map((item) => item.answer),
    )
  })

  it('emits no prohibited commerce, comparison, origin or manufacturer fields', () => {
    const serialized = JSON.stringify(buildMalaysiaProductHubJsonLd(
      getSiteConfig('tio2-my'),
      toMalaysiaProductHubDto(malaysiaProductHubSource()),
    ))
    expect(serialized).not.toMatch(/Offer|AggregateRating|manufacturer|countryOfOrigin|isVariantOf|isSimilarTo|Rubber|M-996 vs|M-2196 vs/iu)
    expect(serialized).not.toMatch(/tio2-a|tio2-b|tiovar|mytio2/iu)
  })
})
