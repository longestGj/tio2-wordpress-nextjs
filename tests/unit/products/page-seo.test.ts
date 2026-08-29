import {describe, expect, it} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver, EditorialTarget} from '@/lib/editorial/types'
import {
  toProductDetailPageDto,
  toProductFamilyPageDto,
  toProductsHubPageDto,
} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {ProductPageResolver} from '@/lib/products/page-types'
import {buildProductCollectionJsonLd} from '@/lib/seo/product-collection-jsonld'
import {buildProductCollectionMetadata} from '@/lib/seo/product-collection-metadata'
import {buildProductJsonLd} from '@/lib/seo/product-jsonld'
import {buildProductMetadata} from '@/lib/seo/product-metadata'
import {getSiteConfig} from '@/sites'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'

type JsonLdRecord = Readonly<Record<string, unknown>>

const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)

function pathFor(target: EditorialTarget): string | null {
  return target.type === 'product'
    ? productPaths.get(target.id) ?? null
    : resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

const editorial: EditorialLinkResolver = (target) => {
  const path = pathFor(target)
  return path
    ? {...target, title: target.id, path, href: null}
    : null
}

const resolver: ProductPageResolver = {
  editorial,
  publicHref: (path) => path === '/' ? path : null,
  ctaHref: (kind) => `mailto:contact@tio2products.com?subject=${kind}`,
}

const site = getSiteConfig('tio2-a')
const hub = toProductsHubPageDto(structuredClone(productsHubPageInput), resolver)
const family = toProductFamilyPageDto(structuredClone(coatingsFamilyPageInput), resolver)
const detail = toProductDetailPageDto(structuredClone(tpC120ProductPageInput), resolver)

function nodeOfType(values: readonly JsonLdRecord[], type: string): JsonLdRecord {
  const node = values.find((value) => value['@type'] === type)
  if (!node) throw new Error(`Missing ${type} node`)
  return node
}

function propertyNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(propertyNames)
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, nested]) => [key, ...propertyNames(nested)])
}

describe('three-level Product SEO', () => {
  it.each([
    [hub, 'Titanium Dioxide Products | TIOVAR', 'https://tio2products.com/products'],
    [family, 'Titanium Dioxide for Coatings | TIOVAR', 'https://tio2products.com/products/coatings'],
  ] as const)('builds exact collection metadata for $1.level', (page, title, canonical) => {
    expect(buildProductCollectionMetadata(page, site)).toMatchObject({
      title,
      alternates: {canonical},
      openGraph: {type: 'website', url: canonical, title},
    })
  })

  it('builds exact nested Detail metadata without publishing the frozen modified timestamp', () => {
    const metadata = buildProductMetadata(detail, site)
    expect(metadata).toMatchObject({
      title: 'TP-C120 Rutile Titanium Dioxide for Water-Based Paint | TIOVAR',
      alternates: {canonical: 'https://tio2products.com/products/coatings/tp-c120'},
      openGraph: {
        type: 'article',
        url: 'https://tio2products.com/products/coatings/tp-c120',
      },
    })
    expect(metadata.openGraph).not.toHaveProperty('modifiedTime')
  })

  it.each([hub, family] as const)('emits CollectionPage, breadcrumbs and exact visible FAQ parity for $level', (page) => {
    const values = buildProductCollectionJsonLd(page, site)
    expect(values.map((value) => value['@type'])).toEqual([
      'CollectionPage',
      'BreadcrumbList',
      'FAQPage',
    ])
    expect(nodeOfType(values, 'FAQPage').mainEntity).toEqual(
      page.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answerHtml.replace(/<[^>]*>/gu, ''),
        },
      })),
    )
    expect(propertyNames(values)).not.toContain('dateModified')
  })

  it('emits only factual Product, TIOVAR Brand, breadcrumbs and visible FAQ data for Detail', () => {
    const values = buildProductJsonLd(detail, site)
    expect(values.map((value) => value['@type'])).toEqual([
      'Product',
      'Brand',
      'BreadcrumbList',
      'FAQPage',
    ])
    expect(nodeOfType(values, 'Product')).toMatchObject({
      '@id': 'https://tio2products.com/products/coatings/tp-c120#product',
      name: 'TIOVAR TP-C120 Rutile Titanium Dioxide',
      productID: 'TP-C120',
      brand: {'@id': 'https://tio2products.com/#brand'},
    })
    expect(nodeOfType(values, 'Brand')).toMatchObject({name: 'TIOVAR'})
    expect(nodeOfType(values, 'FAQPage').mainEntity).toEqual(
      detail.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answerHtml.replace(/<[^>]*>/gu, ''),
        },
      })),
    )

    const keys = propertyNames(values).map((key) => key.toLowerCase())
    for (const forbidden of [
      'offer', 'offers', 'price', 'availability', 'rating', 'aggregaterating',
      'review', 'manufacturer', 'producer', 'legalname', 'datemodified',
    ]) {
      expect(keys).not.toContain(forbidden)
    }
  })
})
