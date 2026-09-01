import {describe, expect, it} from 'vitest'

import {buildMalaysiaResourceHubJsonLd} from '@/lib/seo/resource-hub-jsonld'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

const hub = (resourceRelations: unknown = []) => toMalaysiaResourceHubDto({
  id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
  malaysiaResourceHubContractJson: JSON.stringify(contract),
  resourceProjection: projectEligibleMalaysiaResources(resourceRelations),
})

const eligible = (pageId: string, displayOrder: number, featuredRank: number | null) => ({
  pageId, siteScope: 'tio2-my', locale: 'en', title: `Research ${pageId}`,
  summary: `Approved summary ${pageId}`, canonicalPath: `/resources/research-${pageId.toLowerCase()}/`,
  canonicalUrl: `https://tio2malaysia.com/resources/research-${pageId.toLowerCase()}/`,
  mappingStatus: 'PUBLIC_ELIGIBLE', childContentStatus: 'APPROVED', claimStatus: 'APPROVED',
  routeStatus: 'VERIFIED_PUBLIC', canonicalStatus: 'VERIFIED', releaseState: 'LIVE_APPROVED',
  featuredRank, displayOrder, kind: 'general',
})

describe('RES-000 JSON-LD', () => {
  it('emits only CollectionPage and BreadcrumbList in current H0', () => {
    const schema = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), hub()) as {'@graph': Array<Record<string, unknown>>}
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList'])
    expect(JSON.stringify(schema)).not.toMatch(/"@type":"(?:ItemList|FAQPage|QAPage|Article|Product|Offer)"/iu)
  })

  it('builds conditional ItemList from the exact visible H3 order', () => {
    const resourceHub = hub([
      eligible('C', 3, null), eligible('A', 1, 1), eligible('B', 2, 2), eligible('D', 4, null),
    ])
    const schema = buildMalaysiaResourceHubJsonLd(getSiteConfig('tio2-my'), resourceHub) as {'@graph': Array<Record<string, unknown>>}
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    const list = schema['@graph'][2] as {numberOfItems: number; itemListElement: Array<{name: string; url: string}>}
    const visible = [...resourceHub.featuredResources, ...resourceHub.latestResources]
    expect(list.numberOfItems).toBe(visible.length)
    expect(list.itemListElement.map(({name, url}) => ({name, url}))).toEqual(
      visible.map((item) => ({name: item.title, url: new URL(item.href, 'https://tio2malaysia.com').href})),
    )
  })
})
