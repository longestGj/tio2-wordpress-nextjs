import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaDocumentCooPage} from '@/components/sites/tio2-my/documents/document-coo-page'
import {buildDocumentCooJsonLd, serializeDocumentCooJsonLd} from '@/lib/seo/document-coo-jsonld'
import {buildDocumentCooMetadata} from '@/lib/seo/document-coo-metadata'
import {toMalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-dto'
import approvedContract from '@/tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json'
import {getSiteConfig} from '@/sites'

const source = {
  id: 'document-coo-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/certificate-of-origin'},
  malaysiaDocumentCooContractJson: JSON.stringify(approvedContract),
}

describe('DOC-COO public contract', () => {
  it('accepts only the exact scoped, published singleton payload', () => {
    expect(toMalaysiaDocumentCooDto(source).identity.pageId).toBe('DOC-COO')
    for (const invalid of [
      {...source, status: 'draft'},
      {...source, siteScopes: {nodes: [{slug: 'tio2-a'}]}},
      {...source, publishingFields: {publicPath: '/documents/reach'}},
      {...source, malaysiaDocumentCooContractJson: JSON.stringify({...approvedContract, privateEvidence: 'not-public'})},
    ]) expect(() => toMalaysiaDocumentCooDto(invalid)).toThrow()
  })

  it('renders exact six-section Buyer Clean content and approved request context', () => {
    const html = renderToStaticMarkup(<MalaysiaDocumentCooPage page={toMalaysiaDocumentCooDto(source)} structuredData={null} />)
    expect(html).toContain('data-page-id="DOC-COO"')
    expect(html.match(/<section/gu)).toHaveLength(6)
    for (const id of ['coo-01', 'coo-02', 'coo-03', 'coo-04', 'coo-05', 'coo-06']) expect(html).toContain(`id="${id}"`)
    expect(html.match(/Request Origin Documentation/gu)).toHaveLength(2)
    expect(html.match(/document_types%5B%5D=origin_supplier_qualification&amp;source_page_id=DOC-COO/gu)).toHaveLength(2)
    expect(html.match(/customs\.gov\.my/gu)).toHaveLength(2)
    expect(html.match(/<h1/gu)).toHaveLength(1)
  })

  it('emits exact noindex metadata and only WebPage plus visible BreadcrumbList', () => {
    const site = getSiteConfig('tio2-my')
    const page = toMalaysiaDocumentCooDto(source)
    expect(buildDocumentCooMetadata(site, page)).toMatchObject({
      title: approvedContract.seo.title,
      description: approvedContract.seo.description,
      alternates: {canonical: approvedContract.seo.canonical},
      robots: {index: false, follow: false},
    })
    const graph = buildDocumentCooJsonLd(site, page) as {'@graph': Array<Record<string, unknown>>}
    expect(graph['@graph'].map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    expect(graph['@graph'][0]?.name).toBe(approvedContract.sections[0].h1)
    expect(graph['@graph'][0]).toMatchObject({isPartOf: {'@id': 'https://tio2malaysia.com/#website'}})
    const serialized = serializeDocumentCooJsonLd(graph)
    for (const forbidden of ['Product', 'Offer', 'DigitalDocument', 'countryOfOrigin', 'certification', 'source_page_id', 'origin_supplier_qualification']) {
      expect(serialized).not.toContain(forbidden)
    }
  })
})
