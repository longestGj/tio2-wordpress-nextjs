import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaResourceHubJsonLd(
  site: SiteConfig,
  resourceHub: MalaysiaResourceHubDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || resourceHub.identity.siteId !== 'tio2-my') {
    throw new Error('RES-000 Schema is available only for tio2-my')
  }
  const canonical = new URL('/resources/', site.url).href
  const visible = [...resourceHub.featuredResources, ...resourceHub.latestResources]
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical,
      name: resourceHub.seo.title, description: resourceHub.seo.description,
      inLanguage: resourceHub.seo.language,
      isPartOf: {'@id': new URL('/#website', site.url).href},
    },
    {
      '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
      itemListElement: resourceHub.breadcrumb.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.label,
        item: new URL(item.href, site.url).href,
      })),
    },
  ]
  if (visible.length) {
    graph.push({
      '@type': 'ItemList', '@id': `${canonical}#resources`, numberOfItems: visible.length,
      itemListOrder: 'https://schema.org/ItemListOrderAscending',
      itemListElement: visible.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.title,
        url: new URL(item.href, site.url).href,
      })),
    })
  }
  return {'@context': 'https://schema.org', '@graph': graph}
}

export function serializeMalaysiaResourceHubJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
