import {describe, expect, it} from 'vitest'

import {getSiteConfig} from '@/sites'
import {
  COUNTRY_MARKET_IDENTITIES,
  getMalaysiaCountryMarketContract,
} from '@/lib/markets/malaysia-country-market-contracts'
import {toMalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-dto'
import {
  buildMalaysiaCountryMarketJsonLd,
  buildMalaysiaCountryMarketMetadata,
} from '@/lib/seo/market-country-metadata'

const expected = [
  ['MARKET-EU-ES', '/markets/spain/', 'Spain', 4],
  ['MARKET-IN-001', '/markets/india/', 'India', 5],
  ['MARKET-EU-NL', '/markets/netherlands/', 'Netherlands', 5],
  ['MARKET-EU-BE', '/markets/belgium/', 'Belgium', 5],
] as const

function source(pageId: (typeof expected)[number][0]) {
  const contract = getMalaysiaCountryMarketContract(pageId)
  return {
    id: `country-market-${pageId}`,
    modifiedGmt: '2026-09-08T01:02:03',
    status: 'publish',
    recordPageId: pageId,
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: contract.identity.path.replace(/\/$/u, '')},
    malaysiaCountryMarketContractJson: JSON.stringify(contract),
  }
}

describe('four country Market contracts', () => {
  it('registers only the four authorized identities and approved module counts', () => {
    expect(COUNTRY_MARKET_IDENTITIES).toEqual(expected.map(([pageId, path]) => ({pageId, path})))
    for (const [pageId, path, country, moduleCount] of expected) {
      const contract = getMalaysiaCountryMarketContract(pageId)
      expect(contract.identity).toMatchObject({pageId, siteScope: 'tio2-my', locale: 'en', path})
      expect(contract.destinationCountry).toBe(country)
      expect(contract.modules).toHaveLength(moduleCount)
      expect(contract.modules[0]).toMatchObject({id: 'hero', kind: 'hero'})
      expect(contract.breadcrumb.at(-1)).toMatchObject({label: country, href: path})
    }
    expect(() => getMalaysiaCountryMarketContract('MARKET-EU-PL')).toThrow()
  })

  it.each([
    ['MARKET-EU-ES', {
      hero: ['primary', 'secondary'], applications: ['text'], documents: ['secondary', 'text'],
      quote: ['primary', 'text', 'text'],
    }],
    ['MARKET-IN-001', {
      hero: ['primary', 'secondary'], applications: ['secondary'], documents: ['secondary', 'secondary', 'secondary'],
      quote: ['primary'],
    }],
    ['MARKET-EU-NL', {
      hero: ['primary', 'secondary'], products: ['secondary'], documents: ['secondary', 'secondary'], quote: ['primary'],
    }],
    ['MARKET-EU-BE', {
      hero: ['primary', 'secondary'], applications: ['secondary'], documents: ['secondary', 'secondary', 'text'],
      quote: ['primary'],
    }],
  ] as const)('keeps the approved action hierarchy for %s', (pageId, expectedStyles) => {
    const contract = getMalaysiaCountryMarketContract(pageId)
    const actual = Object.fromEntries(contract.modules
      .filter((module) => module.actions?.length)
      .map((module) => [module.id, module.actions!.map((action) => action.style)]))
    expect(actual).toEqual(expectedStyles)
  })

  it.each(expected)('fails closed for %s wrong scope, path, status, record identity and payload', (pageId) => {
    const valid = source(pageId)
    expect(() => toMalaysiaCountryMarketPageDto(pageId, {...valid, siteScopes: {nodes: [{slug: 'tio2-a'}]}})).toThrow()
    expect(() => toMalaysiaCountryMarketPageDto(pageId, {...valid, publishingFields: {publicPath: '/markets/other'}})).toThrow()
    expect(() => toMalaysiaCountryMarketPageDto(pageId, {...valid, status: 'draft'})).toThrow()
    expect(() => toMalaysiaCountryMarketPageDto(pageId, {...valid, recordPageId: 'MARKET-UK-001'})).toThrow()
    expect(() => toMalaysiaCountryMarketPageDto(pageId, {...valid, malaysiaCountryMarketContractJson: '{}'})).toThrow()
  })

  it.each(expected)('builds scoped noindex metadata and the approved two-node graph for %s', (pageId, path) => {
    const dto = toMalaysiaCountryMarketPageDto(pageId, source(pageId))
    const site = getSiteConfig('tio2-my')
    const metadata = buildMalaysiaCountryMarketMetadata(site, dto)
    expect(metadata.alternates).toEqual({canonical: `https://tio2malaysia.com${path}`})
    expect(metadata.robots).toEqual({index: false, follow: false})
    const graph = buildMalaysiaCountryMarketJsonLd(site, dto)['@graph'] as Record<string, unknown>[]
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(graph[0]).toMatchObject({
      '@id': `https://tio2malaysia.com${path}#webpage`,
      isPartOf: {'@id': 'https://tio2malaysia.com/#website'},
      publisher: {'@id': 'https://tio2malaysia.com/#organization'},
      breadcrumb: {'@id': `https://tio2malaysia.com${path}#breadcrumb`},
    })
    expect(JSON.stringify(graph)).not.toMatch(/Product|Offer|LocalBusiness|FAQPage|HowTo|datePublished|image/)
    expect(() => buildMalaysiaCountryMarketMetadata(getSiteConfig('tio2-a'), dto)).toThrow()
  })
})
