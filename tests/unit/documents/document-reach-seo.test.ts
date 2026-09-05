import {describe, expect, it} from 'vitest'

import {buildDocumentReachJsonLd} from '@/lib/seo/document-reach-jsonld'
import {buildDocumentReachMetadata} from '@/lib/seo/document-reach-metadata'
import {toMalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json'

function page(receiverReady = true) {
  return toMalaysiaDocumentReachDto({
    id: 'document-reach-901', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
    malaysiaDocumentReachContractJson: JSON.stringify(approvedContract),
    routeReadiness: {'CONV-DOC': receiverReady, 'DOC-000': true, 'MARKET-EU-001': true},
  })
}

describe('DOC-REACH SEO and Schema', () => {
  it('uses exact query-free noindex metadata without hreflang or page-local images', () => {
    expect(buildDocumentReachMetadata(getSiteConfig('tio2-my'), page())).toEqual(expect.objectContaining({
      title: 'Titanium Dioxide REACH Registration: What to Verify | TiO2 Malaysia',
      description: 'Understand which EU REACH information titanium dioxide buyers should verify across substance identity, legal-entity scope, supply-chain role, source and review date.',
      alternates: {canonical: 'https://tio2malaysia.com/documents/reach/'},
      robots: {index: false, follow: false},
    }))
    const metadata = buildDocumentReachMetadata(getSiteConfig('tio2-my'), page())
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(metadata.openGraph).toMatchObject({type: 'website', url: 'https://tio2malaysia.com/documents/reach/', images: []})
  })

  it('emits only WebPage and BreadcrumbList and suppresses receiver relation atomically', () => {
    const eligible = buildDocumentReachJsonLd(getSiteConfig('tio2-my'), page(true)) as {'@graph': Array<Record<string, unknown>>}
    expect(eligible['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(eligible['@graph'][0]).toMatchObject({
      url: 'https://tio2malaysia.com/documents/reach/', inLanguage: 'en',
      relatedLink: [
        'https://tio2malaysia.com/request-documents/',
        'https://tio2malaysia.com/markets/european-union/',
        'https://tio2malaysia.com/documents/',
      ],
    })
    const unavailable = buildDocumentReachJsonLd(getSiteConfig('tio2-my'), page(false)) as {'@graph': Array<Record<string, unknown>>}
    expect(unavailable['@graph'][0].relatedLink).toEqual([
      'https://tio2malaysia.com/markets/european-union/',
      'https://tio2malaysia.com/documents/',
    ])
    expect(JSON.stringify(unavailable)).not.toContain('request-documents')
  })
})
