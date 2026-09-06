import {describe, expect, it} from 'vitest'

import {buildMalaysiaEuMarketJsonLd} from '@/lib/seo/market-page-jsonld'
import {buildMalaysiaEuMarketMetadata} from '@/lib/seo/market-page-metadata'
import {toMalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

function marketPage() {
  return toMalaysiaEuMarketPageDto({
    id: 'market-eu-001-my-1', modifiedGmt: '2026-09-04T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/european-union'},
    malaysiaEuMarketContractJson: JSON.stringify(approvedContract),
  })
}

describe('MARKET-EU-001 SEO and Schema', () => {
  it('uses exact metadata, one self-canonical and noindex while release is disabled', () => {
    const metadata = buildMalaysiaEuMarketMetadata(
      getSiteConfig('tio2-my'), marketPage(), {VERCEL_ENV: 'production'},
    )
    expect(metadata).toMatchObject({
      title: approvedContract.seo.title,
      description: approvedContract.seo.metaDescription,
      alternates: {canonical: approvedContract.seo.canonical},
      robots: {index: false, follow: false},
      openGraph: {
        url: approvedContract.seo.canonical,
        title: approvedContract.seo.ogTitle,
        description: approvedContract.seo.ogDescription,
      },
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
  })

  it('emits only WebPage and BreadcrumbList while destination routes remain unavailable', () => {
    const schema = buildMalaysiaEuMarketJsonLd(getSiteConfig('tio2-my'), marketPage()) as {
      '@graph': Array<Record<string, unknown>>
    }
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(schema['@graph'][0]).toMatchObject({
      '@id': `${approvedContract.seo.canonical}#webpage`,
      url: approvedContract.seo.canonical,
      name: approvedContract.hero.h1,
      description: approvedContract.seo.metaDescription,
      inLanguage: 'en',
      isPartOf: {'@id': 'https://tio2malaysia.com/#website'},
    })
    expect(JSON.stringify(schema)).not.toMatch(
      /"@type":"(?:ItemList|FAQPage|QAPage|Product|ProductGroup|Offer|LocalBusiness)"|warehouse|certification|tio2-a|tio2-b/iu,
    )
    expect(JSON.stringify(schema)).not.toContain(approvedContract.trade.datedContext)
  })

  it('adds the six-country ItemList only after every release and route gate is available', () => {
    const page = structuredClone(marketPage())
    Object.assign(page.releaseControls, {
      originHold: 'CLOSED', relatedRoutesReady: true, conversionRuntimeReady: true,
      runtimeAcceptanceReady: true, releaseEnabled: true, indexingAuthorized: true,
    })
    for (const relation of Object.values(page.relations)) {
      ;(relation as {routeState: string}).routeState = 'available'
    }
    for (const item of [...page.applications.items, ...page.destinations.items]) {
      ;(item as {routeState: string}).routeState = 'available'
    }
    const schema = buildMalaysiaEuMarketJsonLd(getSiteConfig('tio2-my'), page) as {
      '@graph': Array<Record<string, unknown>>
    }
    expect(schema['@graph'].map((node) => node['@type'])).toEqual([
      'WebPage', 'BreadcrumbList', 'ItemList',
    ])
    expect(schema['@graph'][2]).toMatchObject({numberOfItems: 6})
    expect(JSON.stringify(schema['@graph'][2])).toContain('https://tio2malaysia.com/markets/germany/')
  })
})
