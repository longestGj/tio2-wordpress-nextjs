import type {ProductFamilyPageDto, ProductsHubPageDto} from '@/lib/products/page-types'
import type {SiteConfig} from '@/sites'

import type {JsonLdNode} from './product-jsonld'
import {htmlToPlainText} from './text'

function safeText(value: string, maximumLength?: number): string {
  return htmlToPlainText(value, maximumLength ?? Math.max(value.length, 1))
    .replace(/\s+([,.;:!?])/gu, '$1')
}

export function buildProductCollectionJsonLd(
  page: ProductsHubPageDto | ProductFamilyPageDto,
  site: SiteConfig,
): JsonLdNode[] {
  const canonical = new URL(page.identity.path, site.url).href
  const breadcrumbs = [
    {name: 'Home', path: '/'},
    ...(page.level === 'family' ? [{name: 'Products', path: '/products'}] : []),
    {name: page.identity.title, path: page.identity.path},
  ]
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      '@id': `${canonical}#collection`,
      name: safeText(page.identity.title, 180),
      description: safeText(page.seo.description, 220),
      url: canonical,
      breadcrumb: {'@id': `${canonical}#breadcrumb`},
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: breadcrumbs.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: safeText(item.name, 180),
        item: new URL(item.path, site.url).href,
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: page.faqs.map((faq) => ({
        '@type': 'Question',
        name: safeText(faq.question, 180),
        acceptedAnswer: {'@type': 'Answer', text: safeText(faq.answerHtml)},
      })),
    },
  ]
}
