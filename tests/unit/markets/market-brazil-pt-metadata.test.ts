import {describe, expect, it} from 'vitest'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json'
import {toMalaysiaBrazilPtMarketPageDto} from '@/lib/wordpress/market-page-brazil-pt-v02-dto'
import {
  buildMalaysiaBrazilPtMarketJsonLd,
  buildMalaysiaBrazilPtMarketMetadata,
} from '@/lib/seo/market-brazil-pt-metadata'

const page = toMalaysiaBrazilPtMarketPageDto({
  id: 'brazil-pt-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/pt-br/markets/brazil'},
  malaysiaBrazilPtMarketContractJson: JSON.stringify(contract),
})

describe('Brazil PT metadata', () => {
  it('uses approved PT metadata, noindex and no premature alternates or social image', () => {
    const metadata = buildMalaysiaBrazilPtMarketMetadata(getSiteConfig('tio2-my'), page)
    expect(metadata).toMatchObject({
      title: contract.seo.title,
      description: contract.seo.description,
      alternates: {canonical: contract.seo.canonical},
      robots: {index: false, follow: false},
      openGraph: {type: 'website', locale: 'pt_BR', url: contract.seo.canonical, images: []},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(JSON.stringify(metadata)).not.toMatch(/x-default|hreflang|"languages"/u)
  })

  it('emits only WebPage and BreadcrumbList with pt-BR and shared entity references', () => {
    const value = buildMalaysiaBrazilPtMarketJsonLd(getSiteConfig('tio2-my'), page) as {
      readonly '@graph': readonly Readonly<Record<string, unknown>>[]
    }
    expect(value['@graph'].map(entry => entry['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(value['@graph'][0]).toMatchObject({
      '@id': `${contract.seo.canonical}#webpage`,
      url: contract.seo.canonical,
      inLanguage: 'pt-BR',
      isPartOf: {'@id': 'https://tio2malaysia.com/#website'},
      publisher: {'@id': 'https://tio2malaysia.com/#organization'},
    })
    expect(JSON.stringify(value)).not.toMatch(/Product|Offer|LocalBusiness|FAQPage|HowTo|x-default/u)
  })

  it.each(['tio2-a', 'tio2-b'] as const)('rejects %s metadata scope', siteId => {
    expect(() => buildMalaysiaBrazilPtMarketMetadata(getSiteConfig(siteId), page)).toThrow(/scope mismatch/u)
  })
})
