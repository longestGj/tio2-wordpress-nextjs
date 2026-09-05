import type {MalaysiaResourceOriginDto} from '@/lib/wordpress/resource-origin-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

interface ValidResourceOriginArticleMetadata {
  readonly authorName: string
  readonly publisherName: string
  readonly publisherLogoAssetKey: string
  readonly datePublished: string
  readonly dateModified: string
  readonly lastReviewedAt: string
  readonly maintenanceOwner: string
}

interface ResourceOriginArticleOptions {
  readonly articleMetadata?: unknown
  readonly visible?: boolean
}

function nonempty(value: unknown): value is string {
  return typeof value === 'string' && Boolean(value) && value.trim() === value
}

function isoDate(value: unknown): value is string {
  if (!nonempty(value) || !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
}

function validArticleMetadata(value: unknown): value is ValidResourceOriginArticleMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const item = value as Record<string, unknown>
  return nonempty(item.authorName) && nonempty(item.publisherName) &&
    nonempty(item.publisherLogoAssetKey) && /^\/tio2-my\/brand\/[a-z0-9.-]+\.svg$/u.test(item.publisherLogoAssetKey) &&
    isoDate(item.datePublished) && isoDate(item.dateModified) && isoDate(item.lastReviewedAt) &&
    nonempty(item.maintenanceOwner)
}

export function buildMalaysiaResourceOriginJsonLd(
  site: SiteConfig,
  page: MalaysiaResourceOriginDto,
  options: ResourceOriginArticleOptions = {},
): JsonLdObject {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('RES-ORIGIN Schema is available only for tio2-my')
  }
  const canonical = new URL('/resources/non-china-titanium-dioxide/', site.url).href
  if (canonical !== page.identity.canonical || canonical !== page.seo.canonical) {
    throw new Error('RES-ORIGIN Schema canonical does not match the Malaysia site')
  }
  const graph: JsonLdObject[] = [
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: page.hero.h1,
      description: page.seo.description,
      inLanguage: page.seo.language,
      isPartOf: {'@id': new URL('/#website', site.url).href},
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: page.breadcrumb.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: index === page.breadcrumb.length - 1
          ? canonical
          : new URL(page.eligibleRelations.find(({relationKey}) => relationKey === item.relationKey)?.href ?? '/', site.url).href,
      })),
    },
  ]
  const metadata = options.articleMetadata ?? page.articleMetadata
  if (options.visible === true && validArticleMetadata(metadata)) {
    graph.push({
      '@type': 'Article',
      '@id': `${canonical}#article`,
      mainEntityOfPage: {'@id': `${canonical}#webpage`},
      headline: page.hero.h1,
      description: page.seo.description,
      inLanguage: page.seo.language,
      author: {'@type': 'Organization', name: metadata.authorName},
      publisher: {
        '@type': 'Organization',
        name: metadata.publisherName,
        logo: {'@type': 'ImageObject', url: new URL(metadata.publisherLogoAssetKey, site.url).href},
      },
      datePublished: metadata.datePublished,
      dateModified: metadata.dateModified,
    })
  }
  return {'@context': 'https://schema.org', '@graph': graph}
}

export function serializeMalaysiaResourceOriginJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
