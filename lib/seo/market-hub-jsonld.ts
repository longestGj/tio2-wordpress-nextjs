import type {MalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaMarketHubJsonLd(
  site: SiteConfig,
  marketHub: MalaysiaMarketHubDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || marketHub.identity.siteId !== 'tio2-my') {
    throw new Error('MARKET-000 Schema is available only for tio2-my')
  }
  const canonical = new URL('/markets/', site.url).href
  const description = marketHub.releaseControls.firstLevelRoutesApproved
    ? marketHub.seo.fullRouteDescription
    : marketHub.seo.routeSafeDescription

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#collection-page`,
        url: canonical,
        name: marketHub.hero.h1,
        description,
        inLanguage: 'en',
        isPartOf: {'@id': new URL('/#website', site.url).href},
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: marketHub.breadcrumb.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
      {
        '@type': 'ItemList',
        '@id': `${canonical}#destinations`,
        numberOfItems: marketHub.destinations.items.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: marketHub.destinations.items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          url: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}

export function serializeMalaysiaMarketHubJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
