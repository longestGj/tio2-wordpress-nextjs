import {describe, expect, it, vi} from 'vitest'

import {toApplicationPageDto} from '@/lib/applications/dto'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {ApplicationPageDto} from '@/lib/applications/types'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {getSiteConfig} from '@/sites'
import {
  applicationCategoryInput,
  applicationDetailInput,
  applicationHubInput,
} from '@/tests/fixtures/editorial/application-pages'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

type JsonLdRecord = Readonly<Record<string, unknown>>

const resolveTarget: EditorialLinkResolver = (target) => ({
  ...(resolveCanonicalEditorialTarget(target.type, target.id)?.target ?? target),
  title: `Visible ${target.type} ${target.id}`,
  path:
    resolveCanonicalEditorialTarget(target.type, target.id)?.path ??
    `/unknown/${target.id}`,
  href:
    target.type === 'resource'
      ? resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
      : null,
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
  it('preserves approved extended Application metadata', async () => {
    const {buildApplicationMetadata} = await import(
      '@/lib/seo/application-metadata'
    )
    const application = fixture('category')
    application.seo = {
      title:
        'Titanium Dioxide for Plastics | Masterbatch, PVC & Engineering Plastics | TIOVAR',
      description:
        'Explore TIOVAR titanium dioxide for masterbatch, film, PVC, polycarbonate and engineering plastics. Compare application-specific starting points by resin, process and finished-part requirements.',
    }

    const metadata = buildApplicationMetadata(
      application,
      getSiteConfig('tio2-a'),
    )

    expect(metadata.title).toBe(application.seo.title)
    expect(metadata.description).toBe(application.seo.description)
    expect(metadata.openGraph).toMatchObject(application.seo)
  })

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

  it('rejects noncanonical Application graph data before generating metadata', async () => {
    const {buildApplicationMetadata} = await import(
      '@/lib/seo/application-metadata'
    )
    const application = fixture('hub')
    application.children = application.children.slice(1)

    expect(() =>
      buildApplicationMetadata(application, getSiteConfig('tio2-a')),
    ).toThrow('canonical Application graph')
  })
})

describe('Application JSON-LD', () => {
  it('keeps the canonical visible breadcrumb order identical to BreadcrumbList', async () => {
    const {buildApplicationBreadcrumbItems, buildApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('detail')
    const site = getSiteConfig('tio2-a')
    const visiblePaths = new Set([
      '/',
      '/applications',
      '/applications/coatings',
      application.identity.path,
    ])
    const visible = (_siteId: import('@/sites').SiteId, path: string) =>
      visiblePaths.has(path)
    const items = buildApplicationBreadcrumbItems(application, site, visible)
    const breadcrumbs = nodeOfType(
      buildApplicationJsonLd(application, site, visible),
      'BreadcrumbList',
    ) as JsonLdRecord & {readonly itemListElement: Array<{name: string; position: number}>}

    expect(items.map(({title}) => title)).toEqual([
      'Home',
      'Applications',
      'Coatings',
      application.identity.title,
    ])
    expect(breadcrumbs.itemListElement.map(({name}) => name)).toEqual(
      items.map(({title}) => title),
    )
    expect(breadcrumbs.itemListElement.map(({position}) => position)).toEqual([1, 2, 3, 4])
  })

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

  it('keeps FAQ parity, preserves text-only private breadcrumbs, and omits private relationship URLs', async () => {
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
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Applications',
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: application.identity.title,
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

  it('keeps hidden Detail parents in BreadcrumbList without publishing their URLs', async () => {
    const {buildApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('detail')
    const visiblePaths = new Set(['/', application.identity.path])
    const breadcrumbs = nodeOfType(
      buildApplicationJsonLd(
        application,
        getSiteConfig('tio2-a'),
        (_siteId, path) => visiblePaths.has(path),
      ),
      'BreadcrumbList',
    ) as JsonLdRecord & {
      readonly itemListElement: Array<Readonly<Record<string, unknown>>>
    }

    expect(breadcrumbs.itemListElement.map(({name}) => name)).toEqual([
      'Home',
      'Applications',
      'Coatings',
      application.identity.title,
    ])
    expect(breadcrumbs.itemListElement.map((item) => item.item ?? null)).toEqual([
      'https://tio2products.com/',
      null,
      null,
      `https://tio2products.com${application.identity.path}`,
    ])
  })

  it('emits only explicitly public relationship URLs and serializes safely', async () => {
    const {buildApplicationJsonLd, serializeApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('hub')
    const values = buildApplicationJsonLd(
      application,
      getSiteConfig('tio2-a'),
      (_siteId, path) =>
        path === '/resources/rutile-vs-anatase-titanium-dioxide',
    )

    expect(JSON.stringify(values)).toContain(
      'https://tio2products.com/resources/rutile-vs-anatase-titanium-dioxide',
    )
    expect(JSON.stringify(values)).not.toContain('/products/tp-p100')

    const serialized = serializeApplicationJsonLd([
      {'@context': 'https://schema.org', '@type': 'WebPage', name: '</script>\u2028x\u2029'},
    ])
    expect(serialized).toContain('\\u003c/script>')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
    expect(serialized).not.toContain('<')
  })

  it('rejects noncanonical Application graph data before generating JSON-LD', async () => {
    const {buildApplicationJsonLd} = await import(
      '@/lib/seo/application-jsonld'
    )
    const application = fixture('category')
    application.children = []

    expect(() =>
      buildApplicationJsonLd(application, getSiteConfig('tio2-a')),
    ).toThrow('canonical Application graph')
  })
})

describe('Application preview metadata', () => {
  it('uses protected dynamic metadata without a static canonical export', async () => {
    const hub = await import('@/app/preview/applications/page')
    const detail = await import('@/app/preview/applications/[...segments]/page')

    expect(typeof hub.generateMetadata).toBe('function')
    expect(typeof detail.generateMetadata).toBe('function')
    expect('metadata' in hub).toBe(false)
    expect('metadata' in detail).toBe(false)
  })
})
