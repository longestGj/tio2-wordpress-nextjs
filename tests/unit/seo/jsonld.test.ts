import {describe, expect, it} from 'vitest'

import {
  buildPageJsonLd,
  serializeJsonLd,
} from '@/lib/seo/jsonld'
import {getSiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'

function page(overrides: Partial<ContentPageDto> = {}): ContentPageDto {
  return {
    id: 'page-101',
    siteId: 'tio2-a',
    path: '/applications/coatings',
    title: 'Coatings',
    excerpt: 'Coatings page excerpt.',
    html: '<p>Coatings page.</p>',
    modified: '2026-08-23T08:30:00Z',
    status: 'publish',
    seo: {
      title: 'Titanium Dioxide for Coatings',
      description: 'Choose titanium dioxide grades for coatings.',
    },
    relatedEntityIds: [],
    ...overrides,
  }
}

describe('page JSON-LD', () => {
  it.each([
    ['tio2-a', 'https://tio2-a.example.com'],
    ['tio2-b', 'https://tio2-b.example.com'],
  ] as const)('uses stable, domain-isolated graph IDs for %s', (siteId, origin) => {
    const graph = buildPageJsonLd(
      getSiteConfig(siteId),
      page({siteId}),
    )

    expect(graph.map((item) => [item['@type'], item['@id']])).toEqual([
      ['Organization', `${origin}/#organization`],
      ['WebSite', `${origin}/#website`],
      ['BreadcrumbList', `${origin}/applications/coatings#breadcrumb`],
      ['WebPage', `${origin}/applications/coatings#webpage`],
    ])
    expect(JSON.stringify(graph)).not.toContain(
      siteId === 'tio2-a' ? 'tio2-b.example.com' : 'tio2-a.example.com',
    )
  })

  it('builds literal site-local breadcrumbs from root through the page', () => {
    const graph = buildPageJsonLd(
      getSiteConfig('tio2-a'),
      page({path: '/applications/coatings/interior', title: 'Interior Coatings'}),
    )
    const breadcrumbs = graph[2]

    expect(breadcrumbs).toMatchObject({
      '@type': 'BreadcrumbList',
      itemListElement: [
        {position: 1, name: 'Home', item: 'https://tio2-a.example.com/'},
        {
          position: 2,
          name: 'Applications',
          item: 'https://tio2-a.example.com/applications',
        },
        {
          position: 3,
          name: 'Coatings',
          item: 'https://tio2-a.example.com/applications/coatings',
        },
        {
          position: 4,
          name: 'Interior Coatings',
          item: 'https://tio2-a.example.com/applications/coatings/interior',
        },
      ],
    })
  })

  it.each([
    '/products',
    '/products/rutile-r-100',
    '/products/categories/rutile',
    '/applications/products',
  ])('keeps generic WordPress Page %s a conservative WebPage', (path) => {
    const graph = buildPageJsonLd(
      getSiteConfig('tio2-a'),
      page({path, title: 'Page title'}),
    )
    const pageObject = graph.at(-1)

    expect(pageObject).toMatchObject({
      '@type': 'WebPage',
      '@id': `https://tio2-a.example.com${path}#webpage`,
      isPartOf: {'@id': 'https://tio2-a.example.com/#website'},
    })
    expect(pageObject).not.toHaveProperty('offers')
    expect(pageObject).not.toHaveProperty('sku')
    expect(pageObject).not.toHaveProperty('headline')
  })

  it.each([
    ['2026-08-23T08:30:00.000Z', '2026-08-23T08:30:00.000Z'],
    ['', undefined],
    ['2026-02-30T08:30:00.000Z', undefined],
    ['2026-08-23T08:30:00', undefined],
  ] as const)('uses only strict UTC modified instant %j', (modified, expected) => {
    const pageObject = buildPageJsonLd(
      getSiteConfig('tio2-a'),
      page({modified}),
    ).at(-1)

    expect(pageObject?.dateModified).toBe(expected)
  })

  it('escapes script-breaking text and JavaScript line separators', () => {
    const serialized = serializeJsonLd([
      {
        '@type': 'Article',
        headline: '</script><script>alert(1)</script>\u2028next\u2029line',
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
