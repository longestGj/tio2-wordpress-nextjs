import type {MalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'

type JsonLdObject = Record<string, unknown>

export function buildMalaysiaDocumentsHubJsonLd(site: SiteConfig, hub: MalaysiaDocumentsHubDto): JsonLdObject {
  if (site.id !== 'tio2-my' || hub.identity.siteId !== 'tio2-my') throw new Error('DOC-000 JSON-LD is available only for tio2-my')
  const canonical = new URL('/documents/', site.url).href
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
        name: hub.seo.title, description: hub.seo.description,
        isPartOf: {'@id': new URL('/#website', site.url).href},
      },
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: hub.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label, item: new URL(item.href, site.url).href,
        })),
      },
      {
        '@type': 'FAQPage', '@id': `${canonical}#faq`,
        mainEntity: hub.buyerQuestions.items.map((item) => ({
          '@type': 'Question', name: item.question,
          acceptedAnswer: {'@type': 'Answer', text: item.answer},
        })),
      },
    ],
  }
}

export function serializeMalaysiaDocumentsHubJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
