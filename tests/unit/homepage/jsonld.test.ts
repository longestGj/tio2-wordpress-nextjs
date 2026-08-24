import {describe, expect, it} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {getSiteConfig} from '@/sites'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function homepageFixture(): HomepageDto {
  return toHomepageDto(makeHomepageNode(), 'tio2-a', {
    linkPolicy: getHomepageLinkPolicy('tio2-a'),
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
  it('emits only Organization, WebSite, WebPage, and visible-content-equal FAQPage', async () => {
    const {buildHomepageJsonLd} = await import('@/lib/seo/homepage-jsonld')
    const homepage = homepageFixture()
    const values = buildHomepageJsonLd(getSiteConfig('tio2-a'), homepage)
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
      buildHomepageJsonLd(getSiteConfig('tio2-a'), homepage).map(
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
