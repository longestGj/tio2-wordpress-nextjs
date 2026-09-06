import type {SiteConfig} from '@/sites'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-rfq-page.json'
import type {JsonLdObject} from './jsonld'
import {serializeJsonLd} from './jsonld'

export function buildMalaysiaRfqJsonLd(site: SiteConfig): JsonLdObject {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') {
    throw new Error('CONV-RFQ Schema is available only for tio2-my')
  }
  const canonical = contract.seo.canonical
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
        name: contract.seo.title, description: contract.seo.description,
        inLanguage: contract.seo.language,
        isPartOf: {'@id': new URL('/#website', site.url).href},
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: contract.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}

export function serializeMalaysiaRfqJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
