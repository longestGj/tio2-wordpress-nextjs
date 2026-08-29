import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'
import type {SiteConfig} from '@/sites'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {serializeJsonLd, type JsonLdObject} from './jsonld'
import {htmlToPlainText} from './text'

export type JsonLdNode = JsonLdObject

function isFamilyAwareProduct(
  product: ProductPageDto | ProductDetailPageDto,
): product is ProductDetailPageDto {
  return 'familySlug' in product.identity
}

function htmlToSafeText(value: string, maximumLength?: number): string {
  const text = htmlToPlainText(
    value,
    maximumLength ?? Math.max(Array.from(value).length, 1),
  )
  return text.replace(/\s+([,.;:!?])/gu, '$1')
}

function buildBreadcrumbs(
  product: ProductPageDto | ProductDetailPageDto,
  site: SiteConfig,
  canonical: string,
): JsonLdNode {
  const isFamilyAware = isFamilyAwareProduct(product)
  const itemListElement = [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: new URL('/', site.url).href,
    },
    ...(isFamilyAware ? [{
      '@type': 'ListItem',
      position: 2,
      name: 'Products',
      item: new URL('/products', site.url).href,
    }, {
      '@type': 'ListItem',
      position: 3,
      name: product.presentation.breadcrumb.familyLabel,
      item: new URL(`/products/${product.identity.familySlug}`, site.url).href,
    }, {
      '@type': 'ListItem',
      position: 4,
      name: htmlToSafeText(product.identity.title, 180),
      item: canonical,
    }] : [{
      '@type': 'ListItem',
      position: 2,
      name: htmlToSafeText(product.identity.title, 180),
      item: canonical,
    }]),
  ]

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement,
  }
}

export function buildProductJsonLd(
  product: ProductPageDto | ProductDetailPageDto,
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

  if (!('familySlug' in product.identity) && isStrictUtcInstant(product.identity.modified)) {
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
          text: htmlToSafeText(faq.answerHtml),
        },
      })),
    },
  ]
}

export function serializeProductJsonLd(values: readonly JsonLdNode[]): string {
  return serializeJsonLd(values)
}
