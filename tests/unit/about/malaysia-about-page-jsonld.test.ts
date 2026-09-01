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

  it('removes restricted graph properties and nodes atomically', () => {
    const partial = buildMalaysiaAboutPageJsonLd(
      getSiteConfig('tio2-my'),
      toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'partial'})),
    )['@graph'] as Array<Record<string, unknown>>
    const partialOrganization = partial.find(({['@type']: type}) => type === 'Organization')!
    expect(partialOrganization.description).not.toContain('35,000 metric tons')
    expect(partial.some(({['@type']: type}) => type === 'Place')).toBe(true)

    const restricted = buildMalaysiaAboutPageJsonLd(
      getSiteConfig('tio2-my'),
      toMalaysiaAboutPageDto(malaysiaAboutPageSource({evidenceState: 'restricted'})),
    )['@graph'] as Array<Record<string, unknown>>
    const organization = restricted.find(({['@type']: type}) => type === 'Organization')!
    const aboutPage = restricted.find(({['@type']: type}) => type === 'AboutPage')!
    expect(organization).not.toHaveProperty('description')
    expect(organization).not.toHaveProperty('location')
    expect(aboutPage).not.toHaveProperty('description')
    expect(restricted.some(({['@type']: type}) => type === 'Place')).toBe(false)
    expect(JSON.stringify(restricted)).not.toContain('Taiping')
    expect(JSON.stringify(restricted)).not.toContain('35,000 metric tons')
  })
})
