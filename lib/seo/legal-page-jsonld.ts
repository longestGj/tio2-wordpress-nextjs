import type {SiteConfig} from '@/sites'
import type {MalaysiaLegalPageDto} from '@/lib/wordpress/legal-pages-v01-types'
import {serializeJsonLd, type JsonLdObject} from './jsonld'

export function buildMalaysiaLegalPageJsonLd(site: SiteConfig, page: MalaysiaLegalPageDto): JsonLdObject {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') throw new Error('Legal Schema is available only for tio2-my')
  const canonical = page.seo.canonical
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
        name: page.seo.title, description: page.seo.description,
        inLanguage: page.locale, dateModified: page.effectiveDate,
        isPartOf: {'@id': new URL('/#website', site.url).href},
        about: {'@id': new URL('/#organization', site.url).href},
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: page.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}

export function serializeMalaysiaLegalPageJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
