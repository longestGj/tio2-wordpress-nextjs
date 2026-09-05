import type {MalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'

type JsonLdObject = Record<string, unknown>

export function buildDocumentReachJsonLd(site: SiteConfig, page: MalaysiaDocumentReachDto): JsonLdObject {
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-REACH JSON-LD is available only for tio2-my')
  }
  const canonical = new URL('/documents/reach/', site.url).href
  const hero = page.modules[0] as unknown as {readonly breadcrumb: readonly {readonly label: string; readonly route: string | null}[]}
  const relatedLink = [
    ...(page.routeReadiness['CONV-DOC'] ? [page.request_contract.receiver_route] : []),
    ...(page.routeReadiness['MARKET-EU-001'] ? ['/markets/european-union/'] : []),
    ...(page.routeReadiness['DOC-000'] ? [page.request_contract.secondary_route] : []),
  ].map((route) => new URL(route, site.url).href)
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
        name: page.seo.title, description: page.seo.meta_description, inLanguage: page.page.language,
        isPartOf: {'@id': new URL('/#website', site.url).href},
        breadcrumb: {'@id': `${canonical}#breadcrumb`}, relatedLink,
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: hero.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label,
          item: item.route ? new URL(item.route, site.url).href : canonical,
        })),
      },
    ],
  }
}

export function serializeDocumentReachJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
