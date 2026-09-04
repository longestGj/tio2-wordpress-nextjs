import type {MalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'

type JsonLdObject = Record<string, unknown>

export function buildDocumentTdsJsonLd(site: SiteConfig, page: MalaysiaDocumentTdsDto): JsonLdObject {
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-TDS JSON-LD is available only for tio2-my')
  }
  const canonical = new URL('/documents/tds-sds-coa/', site.url).href
  const hero = page.modules[0] as unknown as {readonly id: string; readonly breadcrumb: readonly {readonly label: string; readonly route: string | null}[]}
  if (hero.id !== 'hero' || !Array.isArray(hero.breadcrumb)) throw new Error('DOC-TDS hero contract is invalid')
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${canonical}#webpage`, url: canonical,
        name: page.seo.title, description: page.seo.meta_description,
        isPartOf: {'@id': new URL('/#website', site.url).href},
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

export function serializeDocumentTdsJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
