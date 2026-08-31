import type {MalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-types'
import type {SiteConfig} from '@/sites'
import type {JsonLdObject} from './jsonld'
import {serializeJsonLd} from './jsonld'

export function buildMalaysiaProductDetailJsonLd(
  site: SiteConfig,
  product: MalaysiaProductDetailDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || product.identity.siteId !== 'tio2-my') {
    throw new Error('Malaysia Product Detail Schema is available only for tio2-my')
  }
  const canonical = new URL('/products/m-350/', site.url).href
  const productNode = {
    '@type': 'Product',
    '@id': `${canonical}#product`,
    name: product.seo.h1,
    sku: product.identity.gradeCode,
    description: `${product.modules.hero.summaryLead} ${product.modules.hero.summaryBody}`,
    url: canonical,
    category: 'Rutile titanium dioxide pigment',
    additionalProperty: product.modules.technical.rows.map((row) => ({
      '@type': 'PropertyValue',
      name: row.property,
      value: row.typical,
      description: `Standard: ${row.standard}; Typical Value: ${row.typical}`,
    })),
  }
  const breadcrumbNode = {
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: product.breadcrumb.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, site.url).href,
    })),
  }
  return {'@context': 'https://schema.org', '@graph': [productNode, breadcrumbNode]}
}

export function serializeMalaysiaProductDetailJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
