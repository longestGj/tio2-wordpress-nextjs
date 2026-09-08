import {describe, expect, it} from 'vitest'

import {buildMalaysiaApplicationHubJsonLd} from '@/lib/seo/application-hub-jsonld'
import {buildMalaysiaApplicationHubMetadata} from '@/lib/seo/application-hub-metadata'
import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

function dto(childReady = true) {
  return toMalaysiaApplicationHubDto({
    id: 'application-hub-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/applications'},
    malaysiaApplicationHubContractJson: JSON.stringify(contract),
    routeReadiness: Object.fromEntries(contract.routeRegistry.map((route) => [route.targetPageId, route.targetPageId.startsWith('APP-') ? childReady : true])),
  })
}

describe('APP-000 SEO', () => {
  it('emits exact protected metadata and clean canonical', () => {
    expect(buildMalaysiaApplicationHubMetadata(getSiteConfig('tio2-my'), dto(), {})).toMatchObject({
      title: 'Applications | TiO2 Malaysia',
      alternates: {canonical: 'https://tio2malaysia.com/applications/'},
      robots: {index: false, follow: false},
    })
  })

  it('emits conditional child ItemList and no product/suitability schema', () => {
    const graph = buildMalaysiaApplicationHubJsonLd(getSiteConfig('tio2-my'), dto())['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['CollectionPage', 'BreadcrumbList', 'ItemList'])
    expect(graph[2]).toMatchObject({numberOfItems: 5, name: 'Choose by Application'})
    expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|Review|FAQPage|suitab/iu)
    expect((buildMalaysiaApplicationHubJsonLd(getSiteConfig('tio2-my'), dto(false))['@graph'] as unknown[])).toHaveLength(2)
  })
})
