import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceHubJsonLd} from '@/lib/seo/resource-hub-jsonld'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import {
  resourceFixturePolicies,
  resourceH3Relations,
  resourceH2UnrankedRelations,
  resourceH4Relations,
  resourceH5Relations,
} from '@/tests/fixtures/tio2-my-resource-hub-states'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

const hub = (resourceRelations: unknown = []) => toMalaysiaResourceHubDto({
  id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
  malaysiaResourceHubContractJson: JSON.stringify(contract),
  resourceProjection: projectEligibleMalaysiaResources(resourceRelations, resourceFixturePolicies),
})

describe('RES-000 JSON-LD', () => {
  it('emits only CollectionPage and BreadcrumbList in current H0', () => {
    const schema = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), hub()) as {'@graph': Array<Record<string, unknown>>}
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList'])
    expect(JSON.stringify(schema)).not.toMatch(/"@type":"(?:ItemList|FAQPage|QAPage|Article|Product|Offer)"/iu)
  })

  it('builds conditional ItemList from the exact visible H3 order', () => {
    const resourceHub = hub(resourceH3Relations)
    const schema = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), resourceHub) as {'@graph': Array<Record<string, unknown>>}
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    const list = schema['@graph'][2] as {numberOfItems: number; itemListElement: Array<{name: string; url: string}>}
    const visible = [...resourceHub.featuredResources, ...resourceHub.latestResources]
    expect(list.numberOfItems).toBe(visible.length)
    expect(list.itemListElement.map(({name, url}) => ({name, url}))).toEqual(
      visible.map((item) => ({name: item.title, url: new URL(item.href, 'https://tio2malaysia.com').href})),
    )
  })

  it('emits one ItemList entry for an unranked H2 resource normalized to Featured', () => {
    const resourceHub = hub(resourceH2UnrankedRelations)
    expect(resourceHub.featuredResources.map(({pageId}) => pageId)).toEqual(['RES-PROC'])
    expect(resourceHub.latestResources).toEqual([])
    const schema = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), resourceHub) as {'@graph': Array<Record<string, unknown>>}
    const itemList = schema['@graph'].find((node) => node['@type'] === 'ItemList') as {
      numberOfItems: number
      itemListElement: Array<{position: number; url: string}>
    }
    expect(itemList.numberOfItems).toBe(1)
    expect(itemList.itemListElement).toEqual([{
      '@type': 'ListItem',
      position: 1,
      name: 'Chloride vs Sulfate Titanium Dioxide',
      url: 'https://tio2malaysia.com/resources/chloride-vs-sulfate-titanium-dioxide/',
    }])
  })

  it('removes an H5 Trade ItemList relation in the same recomputation', () => {
    const h4 = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), hub(resourceH4Relations)) as {'@graph': Array<Record<string, unknown>>}
    const h5 = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), hub(resourceH5Relations)) as {'@graph': Array<Record<string, unknown>>}
    expect(JSON.stringify(h4)).toContain('eu-titanium-dioxide-anti-dumping-duty')
    expect(JSON.stringify(h5)).not.toContain('eu-titanium-dioxide-anti-dumping-duty')
    const itemList = h5['@graph'].find((node) => node['@type'] === 'ItemList') as {numberOfItems: number; itemListElement: unknown[]}
    expect(itemList.numberOfItems).toBe(2)
    expect(itemList.itemListElement).toHaveLength(2)
  })
})
