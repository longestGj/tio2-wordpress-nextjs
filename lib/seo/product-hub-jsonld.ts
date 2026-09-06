import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaProductHubJsonLd(
  site: SiteConfig,
  productHub: MalaysiaProductHubDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || productHub.identity.siteId !== 'tio2-my') {
    throw new Error('PRODUCT-000 Schema is available only for tio2-my')
  }

  const canonical = new URL('/products/', site.url).href
  const grades = productHub.directory.groups.flatMap((group) => group.grades)

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: productHub.seo.title,
        description: productHub.seo.description,
        inLanguage: productHub.seo.language,
        isPartOf: {'@id': new URL('/#website', site.url).href},
      },
      {
        '@type': 'BreadcrumbList',
        '@id': `${canonical}#breadcrumb`,
        itemListElement: productHub.breadcrumb.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
      {
        '@type': 'ItemList',
        '@id': `${canonical}#grades`,
        numberOfItems: grades.length,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        itemListElement: grades.map((grade, index) => {
          const url = new URL(grade.href, site.url).href
          return {
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'Product',
              '@id': `${url}#product`,
              url,
              name: grade.gradeId,
              description: grade.summary,
              category: 'Titanium dioxide pigment',
            },
          }
        }),
      },
      {
        '@type': 'FAQPage',
        '@id': `${canonical}#faq`,
        mainEntity: productHub.buyerQuestions.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer,
          },
        })),
      },
    ],
  }
}

export function serializeMalaysiaProductHubJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
