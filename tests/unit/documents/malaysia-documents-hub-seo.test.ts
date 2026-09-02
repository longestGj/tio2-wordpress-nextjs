import {describe, expect, it} from 'vitest'

import {buildMalaysiaDocumentsHubJsonLd} from '@/lib/seo/documents-hub-jsonld'
import {buildMalaysiaDocumentsHubMetadata} from '@/lib/seo/documents-hub-metadata'
import {toMalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'

const hub = () => toMalaysiaDocumentsHubDto({
  id: 'documents-hub-1', modifiedGmt: '2026-09-02T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents'},
  malaysiaDocumentsHubContractJson: JSON.stringify(contract),
})

describe('DOC-000 SEO and JSON-LD', () => {
  it('uses exact metadata, one self-canonical, no hreflang and noindex before release', () => {
    const metadata = buildMalaysiaDocumentsHubMetadata(getSiteConfig('tio2-my'), hub(), {VERCEL_ENV: 'production'})
    expect(metadata).toMatchObject({
      title: 'Documents for Product Qualification | TiO2 Malaysia',
      description: 'Request technical, safety, quality, COA, origin and supplier-qualification documentation for a selected titanium dioxide grade.',
      alternates: {canonical: 'https://tio2malaysia.com/documents/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
    expect(metadata.openGraph).toMatchObject({title: contract.seo.title, description: contract.seo.description, images: []})
  })

  it('emits only WebPage, BreadcrumbList and exact six-question FAQPage', () => {
    const schema = buildMalaysiaDocumentsHubJsonLd(getSiteConfig('tio2-my'), hub()) as {'@graph': Array<Record<string, unknown>>}
    expect(schema['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList', 'FAQPage'])
    const faq = schema['@graph'][2] as {mainEntity: Array<{name: string; acceptedAnswer: {text: string}}>}
    expect(faq.mainEntity).toEqual(contract.buyerQuestions.items.map((item) => ({
      '@type': 'Question', name: item.question,
      acceptedAnswer: {'@type': 'Answer', text: item.answer},
    })))
    expect(schema['@graph'].some((node) => ['ItemList', 'DigitalDocument', 'Product', 'Offer'].includes(String(node['@type'])))).toBe(false)
    expect(JSON.stringify(schema)).not.toMatch(/potentialAction|contentUrl|encodingFormat/iu)
  })
})
