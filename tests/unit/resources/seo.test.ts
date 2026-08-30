import {describe, expect, it} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import type {SiteAResourceContentManifest} from '@/lib/resources/content-manifest'
import {toTechnicalResourcePageDto} from '@/lib/resources/dto'
import {getSiteConfig} from '@/sites'
import resourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.synthetic.json'

type JsonLdRecord = Readonly<Record<string, unknown>>

const resourceManifest =
  resourceManifestJson as unknown as SiteAResourceContentManifest
const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: `Visible ${target.type} ${target.id}`,
        path: canonical.path,
        href: canonical.path,
      }
    : null
}

function fixture(id: 'resources-hub' | 'article-01') {
  const source = resourceManifest.records.find((record) => record.identity.id === id)
  if (!source) throw new Error(`Missing Resource fixture: ${id}`)
  return toTechnicalResourcePageDto(structuredClone(source), resolveTarget)
}

function nodeOfType(values: readonly JsonLdRecord[], type: string) {
  const node = values.find((candidate) => candidate['@type'] === type)
  if (!node) throw new Error(`Missing ${type} node`)
  return node
}

describe('Technical Resource metadata', () => {
  it('uses collection-oriented website metadata for the Resource Hub', async () => {
    const {buildResourceMetadata} = await import('@/lib/seo/resource-metadata')
    const resource = fixture('resources-hub')
    const metadata = buildResourceMetadata(resource, getSiteConfig('tio2-a'))

    expect(metadata).toMatchObject({
      title: resource.seo.title,
      description: resource.seo.description,
      alternates: {canonical: 'https://tio2products.com/resources'},
      openGraph: {
        type: 'website',
        url: 'https://tio2products.com/resources',
        title: resource.seo.title,
        description: resource.seo.description,
      },
    })
  })

  it('uses safe article metadata and only a strict modified instant for Articles', async () => {
    const {buildResourceMetadata} = await import('@/lib/seo/resource-metadata')
    const resource = fixture('article-01')
    const metadata = buildResourceMetadata(
      {
        ...resource,
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
      modifiedTime: resource.identity.modified,
    })
    expect(JSON.stringify(metadata)).not.toContain('<')
  })
})

describe('Technical Resource JSON-LD', () => {
  it('shares visible breadcrumb items with the Resource UI', async () => {
    const {buildResourceBreadcrumbItems} = await import(
      '@/lib/seo/resource-jsonld'
    )
    const resource = fixture('article-01')
    const items = buildResourceBreadcrumbItems(
      resource,
      getSiteConfig('tio2-a'),
      (_siteId, path) => path === resource.identity.path,
    )

    expect(items).toEqual([
      {title: 'Home', path: '/', href: '/', current: false},
      {
        title: 'Technical Resources',
        path: '/resources',
        href: null,
        current: false,
      },
      {
        title: resource.identity.title,
        path: resource.identity.path,
        href: resource.identity.path,
        current: true,
      },
    ])
  })

  it.each([
    ['resources-hub', 'CollectionPage'],
    ['article-01', 'TechArticle'],
  ] as const)('uses visible %s semantics', async (id, expectedType) => {
    const {buildResourceJsonLd} = await import('@/lib/seo/resource-jsonld')
    const resource = fixture(id)
    const values = buildResourceJsonLd(resource, getSiteConfig('tio2-a'))

    expect(values[0]).toMatchObject({
      '@context': 'https://schema.org',
      '@type': expectedType,
      name: resource.identity.title,
      headline: resource.hero.headline,
      description: resource.seo.description,
      abstract: 'Use consistent methods and representative conditions for fictional comparisons.',
      dateModified: resource.identity.modified,
    })
    expect(JSON.stringify(values)).not.toContain('<p>')
  })

  it('keeps exact visible FAQ parity and omits private breadcrumbs and links', async () => {
    const {buildResourceJsonLd} = await import('@/lib/seo/resource-jsonld')
    const resource = fixture('article-01')
    const values = buildResourceJsonLd(resource, getSiteConfig('tio2-a'))
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
      resource.faqs.map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Document the fictional evaluation boundary.',
        },
      })),
    )
    expect(JSON.stringify(values)).not.toContain('/preview/')
    expect(JSON.stringify(values)).not.toContain('/products/tp-p100')
  })

  it('emits only explicitly visible ancestors and relationship URLs and serializes safely', async () => {
    const {buildResourceJsonLd, serializeResourceJsonLd} = await import(
      '@/lib/seo/resource-jsonld'
    )
    const resource = fixture('article-01')
    const visible = new Set([
      '/resources',
      resource.identity.path,
      '/applications/coatings',
    ])
    const values = buildResourceJsonLd(
      resource,
      getSiteConfig('tio2-a'),
      (_siteId, path) => visible.has(path),
    )

    expect(JSON.stringify(values)).toContain('https://tio2products.com/resources')
    expect(JSON.stringify(values)).toContain(
      'https://tio2products.com/applications/coatings',
    )
    expect(JSON.stringify(values)).not.toContain('/products/tp-p100')

    const serialized = serializeResourceJsonLd([
      {
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        name: '</script>\u2028x\u2029',
      },
    ])
    expect(serialized).toContain('\\u003c/script>')
    expect(serialized).toContain('\\u2028')
    expect(serialized).toContain('\\u2029')
    expect(serialized).not.toContain('<')
  })
})

describe('Technical Resource preview metadata', () => {
  it('uses protected dynamic metadata without a static canonical export', async () => {
    const hub = await import('@/app/preview/resources/page')
    const article = await import('@/app/preview/resources/[slug]/page')

    expect(typeof hub.generateMetadata).toBe('function')
    expect(typeof article.generateMetadata).toBe('function')
    expect('metadata' in hub).toBe(false)
    expect('metadata' in article).toBe(false)
  })
})
