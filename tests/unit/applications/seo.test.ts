import {describe, expect, it} from 'vitest'

import {toApplicationPageDto} from '@/lib/applications/dto'
import type {ApplicationPageDto} from '@/lib/applications/types'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {getSiteConfig} from '@/sites'
import {
  applicationCategoryInput,
  applicationDetailInput,
  applicationHubInput,
} from '@/tests/fixtures/editorial/application-pages'

type JsonLdRecord = Readonly<Record<string, unknown>>

const resolveTarget: EditorialLinkResolver = (target) => ({
  ...target,
  title: `Visible ${target.type} ${target.id}`,
  path:
    target.type === 'product'
      ? `/products/${target.id.toLowerCase()}`
      : target.type === 'resource'
        ? `/resources/${target.id}`
        : `/applications/${target.id}`,
  href: target.type === 'resource' ? `/resources/${target.id}` : null,
})

function fixture(level: ApplicationPageDto['identity']['level']) {
  return toApplicationPageDto(
    level === 'hub'
      ? applicationHubInput
      : level === 'category'
        ? applicationCategoryInput
        : applicationDetailInput,
    resolveTarget,
  )
}

function nodeOfType(values: readonly JsonLdRecord[], type: string): JsonLdRecord {
  const node = values.find((candidate) => candidate['@type'] === type)
  if (!node) throw new Error(`Missing ${type} node`)
  return node
}

describe('Application metadata', () => {
  it.each(['hub', 'category'] as const)(
    'uses collection-oriented website Open Graph metadata for %s pages',
    async (level) => {
      const {buildApplicationMetadata} = await import(
        '@/lib/seo/application-metadata'
      )
      const application = fixture(level)
      const metadata = buildApplicationMetadata(
        application,
        getSiteConfig('tio2-a'),
      )

      expect(metadata).toMatchObject({
        title: application.seo.title,
        description: application.seo.description,
        alternates: {
          canonical: `https://tio2products.com${application.identity.path}`,
        },
        openGraph: {
          type: 'website',
          url: `https://tio2products.com${application.identity.path}`,
          title: application.seo.title,
          description: application.seo.description,
        },
      })
    },
  )

  it('uses safe article-oriented Detail metadata and only a valid modified time', async () => {
    const {buildApplicationMetadata} = await import(
      '@/lib/seo/application-metadata'
    )
    const application = fixture('detail')
    const metadata = buildApplicationMetadata(
      {
        ...application,
        seo: {
          title: '<strong>Safe synthetic title</strong>',
          description: '<p>Safe <em>synthetic</em> description.</p>',
        },
      },
      getSiteConfig('tio2-a'),
    )

    expect(metadata.title).toBe('Safe synthetic title')
    expect(metadata.description).toBe('Safe synthetic description.')
    expect(metadata.openGraph).toMatchObject({
      type: 'article',
      modifiedTime: application.identity.modified,
    })
    expect(JSON.stringify(metadata)).not.toContain('<')
  })
})

describe('Application JSON-LD', () => {
  it.each([
    ['hub', 'CollectionPage'],
    ['category', 'CollectionPage'],
    ['detail', 'WebPage'],
  ] as const)('uses %s primary semantics', async (level, expectedType) => {
    const {buildApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture(level)
    const values = buildApplicationJsonLd(
      application,
      getSiteConfig('tio2-a'),
    )

    expect(values[0]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': expectedType,
      name: application.identity.title,
      description: application.seo.description,
      dateModified: application.identity.modified,
    })
  })

  it('keeps FAQ parity and omits private breadcrumbs and relationship URLs', async () => {
    const {buildApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('category')
    const values = buildApplicationJsonLd(
      application,
      getSiteConfig('tio2-a'),
    )
    const breadcrumbs = nodeOfType(values, 'BreadcrumbList') as JsonLdRecord & {
      readonly itemListElement: unknown
    }
    const faq = nodeOfType(values, 'FAQPage') as JsonLdRecord & {
      readonly mainEntity: unknown
    }

    expect(breadcrumbs.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: 'https://tio2products.com/',
      },
    ])
    expect(faq.mainEntity).toEqual(
      application.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Use a fictional, representative test plan.',
        },
      })),
    )
    expect(JSON.stringify(values)).not.toContain('/preview/')
    expect(JSON.stringify(values)).not.toContain('/resources/article-01')
  })

  it('emits only explicitly public relationship URLs and serializes safely', async () => {
    const {buildApplicationJsonLd, serializeApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('hub')
    const values = buildApplicationJsonLd(
      application,
      getSiteConfig('tio2-a'),
      (_siteId, path) => path === '/resources/article-01',
    )

    expect(JSON.stringify(values)).toContain(
      'https://tio2products.com/resources/article-01',
    )
    expect(JSON.stringify(values)).not.toContain('/products/tp-x999')

    const serialized = serializeApplicationJsonLd([
      {'@context': 'https://schema.org', '@type': 'WebPage', name: '</script>\u2028x\u2029'},
    ])
    expect(serialized).toContain('\\u003c/script>')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
    expect(serialized).not.toContain('<')
  })
})

describe('Application preview metadata', () => {
  it('is noindex,nofollow and exposes no canonical metadata', async () => {
    const hub = await import('@/app/preview/applications/page')
    const detail = await import('@/app/preview/applications/[slug]/page')

    expect(hub.metadata).toEqual({robots: {index: false, follow: false}})
    expect(detail.metadata).toEqual({robots: {index: false, follow: false}})
    expect(hub.metadata.alternates).toBeUndefined()
    expect(detail.metadata.alternates).toBeUndefined()
  })
})
