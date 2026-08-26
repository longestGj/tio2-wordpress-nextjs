import type {ProductPageDto} from '@/lib/products/types'
import type {SiteConfig} from '@/sites'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {serializeJsonLd, type JsonLdObject} from './jsonld'
import {htmlToPlainText} from './text'

export type JsonLdNode = JsonLdObject

function htmlToSafeText(value: string, maximumLength: number): string {
  return htmlToPlainText(value, maximumLength).replace(/\s+([,.;:!?])/gu, '$1')
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

function buildBreadcrumbs(
  product: ProductPageDto,
  site: SiteConfig,
  canonical: string,
): JsonLdNode {
  const segments = product.identity.path.split('/').filter(Boolean)
  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: new URL('/', site.url).href,
    },
    ...segments.map((segment, index) => {
      const isCurrentPage = index === segments.length - 1
      return {
        '@type': 'ListItem',
        position: index + 2,
        name: isCurrentPage
          ? htmlToSafeText(product.identity.title, 180)
          : titleCaseSegment(segment),
        item: new URL(`/${segments.slice(0, index + 1).join('/')}`, site.url)
          .href,
      }
    }),
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement,
  }
}

export function buildProductJsonLd(
  product: ProductPageDto,
  site: SiteConfig,
): JsonLdNode[] {
  const canonical = new URL(product.identity.path, site.url).href
  const brandId = new URL('/#brand', site.url).href
  const productNode: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: htmlToSafeText(product.identity.title, 180),
    productID: product.identity.productId,
    description: htmlToSafeText(product.seo.description, 160),
    url: canonical,
    brand: {'@id': brandId},
  }

  if (isStrictUtcInstant(product.identity.modified)) {
    productNode.dateModified = product.identity.modified
  }

  return [
    productNode,
    {
      '@context': 'https://schema.org',
      '@type': 'Brand',
      '@id': brandId,
      name: 'TIOVAR',
    },
    buildBreadcrumbs(product, site, canonical),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: product.faqs.map((faq) => ({
        '@type': 'Question',
        name: htmlToSafeText(faq.question, 180),
        acceptedAnswer: {
          '@type': 'Answer',
          text: htmlToSafeText(faq.answerHtml, 600),
        },
      })),
    },
  ]
}

export function serializeProductJsonLd(values: readonly JsonLdNode[]): string {
  return serializeJsonLd(values)
}
