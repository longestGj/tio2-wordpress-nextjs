import {resolveVisibleMalaysiaResourceProcArticleMetadata} from '@/lib/resources/malaysia-resource-proc-article'
import type {MalaysiaResourceProcDto} from '@/lib/wordpress/resource-proc-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

const PATH = '/resources/chloride-vs-sulfate-titanium-dioxide/'

export function buildMalaysiaResourceProcJsonLd(
  site: SiteConfig,
  page: MalaysiaResourceProcDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('RES-PROC Schema is available only for tio2-my')
  }
  const canonical = new URL(PATH, site.url).href
  if (canonical !== page.identity.canonical || canonical !== page.seo.canonical) {
    throw new Error('RES-PROC Schema canonical does not match the Malaysia site')
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
  const metadata = resolveVisibleMalaysiaResourceProcArticleMetadata(
    page.schemaMode,
    page.articleMetadata,
  )
  if (metadata) {
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

export function serializeMalaysiaResourceProcJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
