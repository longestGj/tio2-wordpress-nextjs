import type {MalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-types'
import type {SiteConfig} from '@/sites'

import {serializeJsonLd, type JsonLdObject} from './jsonld'

export function buildMalaysiaChlorideProcessJsonLd(
  site: SiteConfig,
  page: MalaysiaChlorideProcessPageDto,
): JsonLdObject {
  if (
    site.id !== 'tio2-my' ||
    page.identity.siteScope !== 'tio2-my' ||
    page.identity.pageId !== 'PRODUCT-PROC-CL'
  ) {
    throw new Error('PRODUCT-PROC-CL Schema is available only for tio2-my')
  }

  const canonical = page.seo.canonical
  const gradeListId = `${canonical}#chloride-grade-list`
  const directoryHeading = page.modules.find(module => module.id === 'CL-03')?.heading ?? 'Explore Chloride-Process Grades'
  const heroHeading = page.modules.find(module => module.id === 'CL-01')?.heading ?? page.seo.title

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: heroHeading,
        description: page.seo.description,
        inLanguage: 'en',
        isPartOf: {'@id': new URL('/#website', site.url).href},
        publisher: {'@id': new URL('/#organization', site.url).href},
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
        mainEntity: {'@id': gradeListId},
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
      {
        '@type': 'ItemList',
        '@id': gradeListId,
        name: directoryHeading,
        numberOfItems: page.grades.length,
        itemListOrder: 'https://schema.org/ItemListUnordered',
        itemListElement: page.grades.map(grade => ({
          '@type': 'ListItem',
          position: grade.position,
          name: grade.gradeNameOrModelCode,
          url: new URL(grade.cleanUrl, site.url).href,
        })),
      },
    ],
  }
}

export function serializeMalaysiaChlorideProcessJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
