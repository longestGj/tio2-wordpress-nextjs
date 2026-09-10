import type {MalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-types'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaContactPageJsonLd(
  site: SiteConfig,
  page: MalaysiaContactPageDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('CONTACT-001 Schema is available only for tio2-my')
  }

  const hasCompleteOrganization = Boolean(
    page.contactDetails.generalInquiries
    && page.contactDetails.operatingCompany
    && page.contactDetails.manufacturingSite,
  )
  const contactPage = {
    '@type': 'ContactPage',
    '@id': page.schema.webPageId,
    url: page.seo.canonical,
    name: page.seo.openGraphTitle,
    description: page.seo.description,
    inLanguage: page.identity.locale,
    isPartOf: {'@id': page.schema.websiteId},
    breadcrumb: {'@id': page.schema.breadcrumbId},
    ...(hasCompleteOrganization ? {mainEntity: {'@id': page.schema.organizationId}} : {}),
  }
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': page.schema.breadcrumbId,
    itemListElement: page.breadcrumb.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: new URL(item.href, site.url).href,
    })),
  }
  const organization = hasCompleteOrganization ? [{
    '@type': 'Organization',
    '@id': page.schema.organizationId,
    name: page.contactDetails.operatingCompany?.value,
    email: page.contactDetails.generalInquiries?.value,
    location: {
      '@type': 'Place',
      name: page.contactDetails.manufacturingSite?.label,
      address: {'@type': 'PostalAddress', ...page.schema.address},
    },
  }] : []

  return {'@context': 'https://schema.org', '@graph': [contactPage, breadcrumb, ...organization]}
}

export function serializeMalaysiaContactPageJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
