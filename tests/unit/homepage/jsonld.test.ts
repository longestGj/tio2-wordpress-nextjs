import {describe, expect, it} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import {getSiteConfig} from '@/sites'
import {
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'
import approvedMalaysiaContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'

function homepageFixture(): HomepageDto {
  return toHomepageDto(makeHomepageNode('tio2-b'), 'tio2-b', {
    linkPolicy: getHomepageLinkPolicy('tio2-b'),
  })
}

function editorialHomepageFixture() {
  const site = getSiteConfig('tio2-a')
  const node = makeSiteAEditorialHomepageNode()
  Reflect.set(
    node.editorialGeoFields!,
    'geoFaqs',
    node.editorialGeoFields!.geoFaqs!.slice(0, 3),
  )
  return toSiteAEditorialHomepageDto(node, {
    rfqHref: site.rfqHref,
  })
}

function collectJsonLdTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(collectJsonLdTypes)
  if (!value || typeof value !== 'object') return []

  const record = value as Record<string, unknown>
  return [
    ...(typeof record['@type'] === 'string' ? [record['@type']] : []),
    ...Object.values(record).flatMap(collectJsonLdTypes),
  ]
}

describe('homepage JSON-LD', () => {
  it('emits the approved Malaysia five-node graph without inferred fields', async () => {
    const {buildHomepageJsonLd} = await import('@/lib/seo/homepage-jsonld')
    const homepage = toMalaysiaHomepageDto({
      id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
      malaysiaHomepageContractJson: JSON.stringify(approvedMalaysiaContract),
    })
    const graph = buildHomepageJsonLd(getSiteConfig('tio2-my'), homepage)
    expect(graph).toEqual(approvedMalaysiaContract.schemaGraph)
    expect((graph as {'@graph': unknown[]})['@graph']).toHaveLength(5)
    expect(JSON.stringify(graph).match(/"manufacturer"/gu)).toHaveLength(1)
    expect(JSON.stringify(graph)).not.toMatch(/FAQPage|Offer|ItemList|ContactPoint|PostalAddress|sameAs|ProductGroup|countryOfOrigin|price|inventory|availability|rating|GTIN/u)
  })
  it('emits only base schema for the Site A v0.2 visible content', async () => {
    const {buildHomepageJsonLd} = await import('@/lib/seo/homepage-jsonld')
    const graph = buildHomepageJsonLd(
      getSiteConfig('tio2-a'),
      editorialHomepageFixture(),
    )

    expect(graph.map((node) => node['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebPage',
    ])
    expect(JSON.stringify(graph)).not.toMatch(/FAQPage|GEO|llms\.txt/i)
  })

  it('emits only Organization, WebSite, WebPage, and visible-content-equal FAQPage for Site B v0.1', async () => {
    const {buildHomepageJsonLd} = await import('@/lib/seo/homepage-jsonld')
    const homepage = homepageFixture()
    const values = buildHomepageJsonLd(getSiteConfig('tio2-b'), homepage)
    const types = values.map((value) => value['@type'])

    expect(types).toEqual(['Organization', 'WebSite', 'WebPage', 'FAQPage'])
    const faqPage = values.find((value) => value['@type'] === 'FAQPage') as {
      readonly mainEntity: ReadonlyArray<{
        readonly name: string
        readonly acceptedAnswer: {readonly text: string}
      }>
    }
    expect(faqPage.mainEntity).toEqual(
      homepage.faq.items.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {'@type': 'Answer', text: item.answer},
      })),
    )

    const allTypes = collectJsonLdTypes(values)
    for (const forbidden of [
      'Product',
      'AggregateRating',
      'Review',
      'Certification',
      'SearchAction',
    ]) {
      expect(allTypes).not.toContain(forbidden)
    }
  })

  it.each([
    ['empty items', (homepage: HomepageDto) => ({...homepage.faq, items: []})],
    [
      'duplicate questions',
      (homepage: HomepageDto) => ({
        ...homepage.faq,
        items: [homepage.faq.items[0], homepage.faq.items[0]],
      }),
    ],
    [
      'empty answer',
      (homepage: HomepageDto) => ({
        ...homepage.faq,
        items: homepage.faq.items.map((item, index) =>
          index === 0 ? {...item, answer: ''} : item,
        ),
      }),
    ],
  ] as const)('omits FAQPage for invalid visible FAQ content: %s', async (_, mutate) => {
    const {buildHomepageJsonLd} = await import('@/lib/seo/homepage-jsonld')
    const base = homepageFixture()
    const homepage: HomepageDto = {...base, faq: mutate(base)}

    expect(
      buildHomepageJsonLd(getSiteConfig('tio2-b'), homepage).map(
        (value) => value['@type'],
      ),
    ).toEqual(['Organization', 'WebSite', 'WebPage'])
  })

  it('serializes script-breaking text and Unicode separators safely', async () => {
    const {serializeHomepageJsonLd} = await import(
      '@/lib/seo/homepage-jsonld'
    )
    const serialized = serializeHomepageJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: '</script>\u2028line\u2029end',
      },
    ])

    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('\u2028')
    expect(serialized).not.toContain('\u2029')
    expect(serialized).toContain('\\u003c/script>')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
  })
})
