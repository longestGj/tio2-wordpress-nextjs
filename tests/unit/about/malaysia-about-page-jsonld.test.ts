import {describe, expect, it} from 'vitest'

import {buildMalaysiaAboutPageJsonLd} from '@/lib/seo/about-page-jsonld'
import {toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {getSiteConfig} from '@/sites'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

describe('ABOUT-001 JSON-LD', () => {
  it('builds only the approved graph and relationships', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    const graph = buildMalaysiaAboutPageJsonLd(getSiteConfig('tio2-my'), dto)['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual([
      'AboutPage', 'Organization', 'Brand', 'Place',
      'AdministrativeArea', 'AdministrativeArea', 'AdministrativeArea', 'AdministrativeArea',
      'BreadcrumbList',
    ])
    const organization = graph[1]!
    expect(organization).toMatchObject({name: dto.schema.organizationName, brand: {'@id': 'https://tio2malaysia.com/#brand'}})
    expect(organization).not.toHaveProperty('legalName')
    expect(organization).not.toHaveProperty('address')
    const keys = graph.flatMap((node) => Object.keys(node))
    expect(keys).not.toContain('manufacturer')
    expect(graph.map((node) => node['@type'])).not.toEqual(expect.arrayContaining([
      'Product', 'Offer', 'AggregateRating', 'Review', 'FAQPage', 'QAPage',
    ]))
  })
})
