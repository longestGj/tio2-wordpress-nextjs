import {describe, expect, it} from 'vitest'

import {buildMalaysiaRfqJsonLd} from '@/lib/seo/rfq-jsonld'
import {buildMalaysiaRfqMetadata} from '@/lib/seo/rfq-metadata'
import {getSiteConfig} from '@/sites'

describe('CONV-RFQ metadata and Schema', () => {
  const site = getSiteConfig('tio2-my')

  it('uses one clean canonical and environment robots regardless of prefill', () => {
    expect(buildMalaysiaRfqMetadata(site, {indexable: false})).toMatchObject({
      title: 'Request a Titanium Dioxide Quote | TiO2 Malaysia',
      description: 'Request a titanium dioxide quotation from TiO2 Malaysia by providing your grade, application, quantity in metric tonnes and destination for review.',
      alternates: {canonical: 'https://tio2malaysia.com/request-a-quote/'},
      robots: {index: false, follow: false},
    })
  })

  it('emits only WebPage and BreadcrumbList with no buyer or offer data', () => {
    const graph = buildMalaysiaRfqJsonLd(site)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['WebPage', 'BreadcrumbList'])
    const serialized = JSON.stringify(graph)
    expect(serialized).not.toMatch(/Product|Offer|FAQPage|QAPage|price|availability|business_email|grade_id/u)
  })
})
