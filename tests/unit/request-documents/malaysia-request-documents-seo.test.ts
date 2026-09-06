import {describe, expect, it} from 'vitest'

import {buildMalaysiaRequestDocumentsJsonLd} from '@/lib/seo/request-documents-jsonld'
import {buildMalaysiaRequestDocumentsMetadata} from '@/lib/seo/request-documents-metadata'
import {getSiteConfig} from '@/sites'

describe('CONV-DOC metadata and Schema', () => {
  const site = getSiteConfig('tio2-my')

  it('uses the exact clean canonical and stays noindex until every release gate passes', () => {
    const metadata = buildMalaysiaRequestDocumentsMetadata(site, {
      indexingAuthorized: false,
      env: {VERCEL_ENV: 'production', TIO2_MY_REQUEST_DOCUMENTS_INDEXING_RELEASE_AUTHORIZED: 'true'},
    })
    expect(metadata).toMatchObject({
      title: 'Request Documents | TiO2 Malaysia',
      description: 'Submit a controlled request for titanium dioxide product, safety, quality, COA, origin or supplier-qualification documentation for human review.',
      alternates: {canonical: 'https://tio2malaysia.com/request-documents/'},
      robots: {index: false, follow: false},
    })
    expect(metadata.alternates).not.toHaveProperty('languages')
  })

  it('permits indexing only with production, contract and independent release authorization', () => {
    expect(buildMalaysiaRequestDocumentsMetadata(site, {
      indexingAuthorized: true,
      env: {VERCEL_ENV: 'production', TIO2_MY_REQUEST_DOCUMENTS_INDEXING_RELEASE_AUTHORIZED: 'true'},
    }).robots).toEqual({index: true, follow: true})
  })

  it('emits only WebPage and BreadcrumbList without request values', () => {
    const graph = buildMalaysiaRequestDocumentsJsonLd(site)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    const serialized = JSON.stringify(graph)
    expect(serialized).not.toMatch(/Product|Offer|FAQPage|QAPage|availability|business_email|product_grade|document_types/u)
  })

  it('rejects any non-Malaysia host or scope', () => {
    expect(() => buildMalaysiaRequestDocumentsMetadata({...site, url: 'https://example.com'}, {
      indexingAuthorized: false, env: {},
    })).toThrow('CONV-DOC metadata is available only for tio2-my')
  })
})
