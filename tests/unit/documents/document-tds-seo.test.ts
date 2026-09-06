import {describe, expect, it} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'
import {buildDocumentTdsJsonLd} from '@/lib/seo/document-tds-jsonld'
import {buildDocumentTdsMetadata} from '@/lib/seo/document-tds-metadata'
import {toMalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-dto'
import {getSiteConfig} from '@/sites'

const page = toMalaysiaDocumentTdsDto({
  id: 'document-tds-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(approvedContract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
})

describe('DOC-TDS SEO/GEO contract', () => {
  it('uses exact metadata, one self-canonical, no hreflang and noindex before Gate 10', () => {
    const metadata = buildDocumentTdsMetadata(getSiteConfig('tio2-my'), page, {VERCEL_ENV: 'production'})
    expect(metadata).toMatchObject({
      title: 'Titanium Dioxide TDS, SDS & COA: What to Request | TiO2 Malaysia',
      description: 'Understand the difference between titanium dioxide TDS, SDS and COA, add the relevant product or batch context, and request the documents needed for review.',
      alternates: {canonical: 'https://tio2malaysia.com/documents/tds-sds-coa/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
  })

  it('emits exactly one WebPage and one BreadcrumbList without action or document claims', () => {
    const schema = buildDocumentTdsJsonLd(getSiteConfig('tio2-my'), page) as {'@graph': Array<Record<string, unknown>>}
    const types = schema['@graph'].map((node) => node['@type'])
    expect(types).toEqual(['WebPage', 'BreadcrumbList'])
    expect(types).not.toEqual(expect.arrayContaining(['FAQPage', 'Product', 'Offer', 'DigitalDocument', 'HowTo']))
    expect(JSON.stringify(schema)).not.toMatch(/potentialAction|contentUrl/iu)
  })
})
