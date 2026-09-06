import {describe, expect, it} from 'vitest'

import {buildMalaysiaRfqJsonLd} from '@/lib/seo/rfq-jsonld'
import {buildMalaysiaRfqMetadata} from '@/lib/seo/rfq-metadata'
import {getSiteConfig} from '@/sites'

describe('CONV-RFQ metadata and Schema', () => {
  const site = getSiteConfig('tio2-my')

  it('uses one clean canonical and keeps the current contract noindex even with the other gates open', () => {
    expect(buildMalaysiaRfqMetadata(site, {
      indexingAuthorized: false,
      env: {VERCEL_ENV: 'production', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'true'},
    })).toMatchObject({
      title: 'Request a Titanium Dioxide Quote | TiO2 Malaysia',
      description: 'Request a titanium dioxide quotation from TiO2 Malaysia by providing your grade, application, quantity in metric tonnes and destination for review.',
      alternates: {canonical: 'https://tio2malaysia.com/request-a-quote/'},
      robots: {index: false, follow: false},
    })
  })

  it.each([
    ['preview environment', true, {VERCEL_ENV: 'preview', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'true'}],
    ['missing release signal', true, {VERCEL_ENV: 'production'}],
    ['non-exact release signal', true, {VERCEL_ENV: 'production', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'TRUE'}],
    ['contract hold', false, {VERCEL_ENV: 'production', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'true'}],
  ] as const)('keeps noindex when the %s gate is closed', (_name, indexingAuthorized, env) => {
    expect(buildMalaysiaRfqMetadata(site, {indexingAuthorized, env}).robots).toEqual({index: false, follow: false})
  })

  it('can index only when production, the page contract and the independent release signal all pass', () => {
    expect(buildMalaysiaRfqMetadata(site, {
      indexingAuthorized: true,
      env: {VERCEL_ENV: 'production', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'true'},
    }).robots).toEqual({index: true, follow: true})
  })

  it('rejects a mismatched site host before evaluating indexing gates', () => {
    expect(() => buildMalaysiaRfqMetadata({...site, url: 'https://example.com'}, {
      indexingAuthorized: true,
      env: {VERCEL_ENV: 'production', TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED: 'true'},
    })).toThrow('CONV-RFQ metadata is available only for tio2-my')
  })

  it('emits only WebPage and BreadcrumbList with no buyer or offer data', () => {
    const graph = buildMalaysiaRfqJsonLd(site)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    const serialized = JSON.stringify(graph)
    expect(serialized).not.toMatch(/Product|Offer|FAQPage|QAPage|price|availability|business_email|grade_id/u)
  })
})
