import type {MalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

const areaSlugs = ['european-union', 'united-kingdom', 'india', 'brazil'] as const

export function buildMalaysiaAboutPageJsonLd(site: SiteConfig, page: MalaysiaAboutPageDto): JsonLdObject {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('ABOUT-001 Schema is available only for tio2-my')
  }
  const canonical = new URL('/about/', site.url).href
  const organizationId = new URL('/#organization', site.url).href
  const brandId = new URL('/#brand', site.url).href
  const placeId = `${canonical}#taiping-manufacturing-site`
  const areaIds = page.schema.areas.map((_, index) => `${canonical}#${areaSlugs[index]}`)
  const placeNode = page.schema.address ? [{
    '@type': 'Place', '@id': placeId, name: page.schema.placeName,
    address: {'@type': 'PostalAddress', ...page.schema.address},
  }] : []
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage', '@id': `${canonical}#webpage`, url: canonical,
        name: page.seo.openGraphTitle,
        ...(page.seo.description ? {description: page.seo.description} : {}),
        inLanguage: page.seo.language,
        isPartOf: {'@id': new URL('/#website', site.url).href},
        mainEntity: {'@id': organizationId},
        about: [{'@id': organizationId}, {'@id': brandId}],
        breadcrumb: {'@id': `${canonical}#breadcrumb`},
      },
      {
        '@type': 'Organization', '@id': organizationId, name: page.schema.organizationName,
        ...(page.schema.organizationDescription ? {description: page.schema.organizationDescription} : {}),
        url: site.url,
        brand: {'@id': brandId},
        ...(page.schema.address ? {location: {'@id': placeId}} : {}),
        areaServed: areaIds.map((id) => ({'@id': id})),
      },
      {'@type': 'Brand', '@id': brandId, name: page.schema.brandName},
      ...placeNode,
      ...page.schema.areas.map((name, index) => ({
        '@type': 'AdministrativeArea', '@id': areaIds[index], name,
      })),
      {
        '@type': 'BreadcrumbList', '@id': `${canonical}#breadcrumb`,
        itemListElement: page.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}

export function serializeMalaysiaAboutPageJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
