import {describe, expect, it} from 'vitest'

import {buildMalaysiaMarketHubJsonLd} from '@/lib/seo/market-hub-jsonld'
import {toMalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

function marketHub() {
  return toMalaysiaMarketHubDto({
    id: 'market-hub-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets'},
    malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
  })
}

describe('MARKET-000 JSON-LD', () => {
  it('emits only CollectionPage, BreadcrumbList and the ordered ten-item ItemList', () => {
    const schema = buildMalaysiaMarketHubJsonLd(getSiteConfig('tio2-my'), marketHub()) as {
      '@graph': Array<Record<string, unknown>>
    }
    expect(schema['@graph'].map((node) => node['@type'])).toEqual([
      'CollectionPage', 'BreadcrumbList', 'ItemList',
    ])
    const itemList = schema['@graph'][2] as {itemListElement: Array<Record<string, unknown>>}
    expect(itemList.itemListElement).toHaveLength(10)
    expect(itemList.itemListElement.map((item) => item.name)).toEqual(
      approvedContract.destinations.items.map((item) => item.label),
    )
    expect(itemList.itemListElement.map((item) => item.url)).toEqual(
      approvedContract.destinations.items.map((item) => new URL(item.href, 'https://tio2malaysia.com').href),
    )
    expect(JSON.stringify(schema)).not.toMatch(
      /FAQPage|QAPage|Product|ProductGroup|Offer|LocalBusiness|Place|pt-BR|RES-TRADE/iu,
    )
  })
})
