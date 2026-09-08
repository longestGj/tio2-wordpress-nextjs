import type {MalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaApplicationHubJsonLd(
  site: SiteConfig,
  applicationHub: MalaysiaApplicationHubDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || applicationHub.identity.siteId !== 'tio2-my') {
    throw new Error('APP-000 Schema is available only for tio2-my')
  }
  const canonical = new URL('/applications/', site.url).href
  const childApplications = applicationHub.applications.flatMap((item) =>
    typeof item.targetPageId === 'string' && typeof item.href === 'string' && applicationHub.routeReadiness[item.targetPageId]
      ? [{title: item.title, href: item.href}]
      : [],
  )
  const graph: Array<Record<string, unknown>> = [
    {
      '@type': 'CollectionPage', '@id': `${canonical}#webpage`, url: canonical,
      name: applicationHub.hero.h1, description: applicationHub.seo.description,
      inLanguage: applicationHub.seo.language,
      breadcrumb: {'@id': `${canonical}#breadcrumb`},
    },
    {
      '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
      itemListElement: applicationHub.breadcrumb.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.label,
        item: new URL(item.href, site.url).href,
      })),
    },
  ]
  if (childApplications.length) {
    graph.push({
      '@type': 'ItemList', '@id': `${canonical}#application-list`, name: 'Choose by Application',
      numberOfItems: childApplications.length,
      itemListElement: childApplications.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.title,
        url: new URL(item.href, site.url).href,
      })),
    })
  }
  return {'@context': 'https://schema.org', '@graph': graph}
}

export function serializeMalaysiaApplicationHubJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
