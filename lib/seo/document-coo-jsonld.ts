import type {SiteConfig} from '@/sites'
import type {MalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-types'

import {serializeJsonLd} from './jsonld'

type JsonLdObject = Record<string, unknown>

export function buildDocumentCooJsonLd(site: SiteConfig, page: MalaysiaDocumentCooDto): JsonLdObject {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('DOC-COO JSON-LD is available only for tio2-my')
  }
  const canonical = page.seo.canonical
  const hero = page.sections[0]
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: hero.h1,
        description: page.seo.description,
        inLanguage: page.seo.language,
        dateModified: page.source.dateModified,
        citation: page.source.url,
        isPartOf: {'@id': new URL('/#website', site.url).href},
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: page.breadcrumb.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}

export function serializeDocumentCooJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
