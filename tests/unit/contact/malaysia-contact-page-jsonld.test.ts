import {describe, expect, it} from 'vitest'

import {buildMalaysiaContactPageJsonLd} from '@/lib/seo/contact-page-jsonld'
import {getSiteConfig} from '@/sites'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

describe('CONTACT-001 JSON-LD', () => {
  it('emits one bounded ContactPage, BreadcrumbList and visible-source Organization', () => {
    const graph = buildMalaysiaContactPageJsonLd(getSiteConfig('tio2-my'), toMalaysiaContactPageDto(malaysiaContactPageSource()))['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['ContactPage', 'BreadcrumbList', 'Organization'])
    expect(graph[0]).toMatchObject({'@id': 'https://tio2malaysia.com/contact/#webpage', url: 'https://tio2malaysia.com/contact/', mainEntity: {'@id': 'https://tio2malaysia.com/#organization'}})
    expect(graph[1]).toMatchObject({itemListElement: [
      {'@type': 'ListItem', position: 1, name: 'Home', item: 'https://tio2malaysia.com/'},
      {'@type': 'ListItem', position: 2, name: 'Contact', item: 'https://tio2malaysia.com/contact/'},
    ]})
    expect(graph[2]).toMatchObject({
      name: 'IKHLAS TITANIUM (MALAYSIA) SDN. BHD.', email: 'info@tio2malaysia.com',
      location: {name: 'Manufacturing Site', address: {streetAddress: 'NO.33 Industrial Perusahaan Ringan Tupai', postalCode: '34000', addressLocality: 'Taiping', addressRegion: 'Perak', addressCountry: 'MY'}},
    })
    const keysAndTypes: string[] = []
    const visit = (value: unknown) => {
      if (Array.isArray(value)) return value.forEach(visit)
      if (!value || typeof value !== 'object') return
      for (const [key, child] of Object.entries(value)) {
        keysAndTypes.push(key)
        if (key === '@type' && typeof child === 'string') keysAndTypes.push(child)
        visit(child)
      }
    }
    visit(graph)
    expect(keysAndTypes).not.toEqual(expect.arrayContaining([
      'legalName', 'telephone', 'ContactPoint', 'openingHours', 'hasMap', 'FAQPage',
      'Product', 'Offer', 'Service', 'potentialAction', 'receiver', 'processor',
    ]))
  })

  it('omits Organization when any visible-source identity fact is restricted', () => {
    const graph = buildMalaysiaContactPageJsonLd(getSiteConfig('tio2-my'), toMalaysiaContactPageDto(malaysiaContactPageSource({mutateFact: 'generalInquiries'})))['@graph'] as Array<Record<string, unknown>>
    expect(graph.map((node) => node['@type'])).toEqual(['ContactPage', 'BreadcrumbList'])
    expect(graph[0]).not.toHaveProperty('mainEntity')
  })
})
