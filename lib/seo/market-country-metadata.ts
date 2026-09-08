import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-types'
import type {JsonLdObject} from './jsonld'

function canonical(site: SiteConfig, page: MalaysiaCountryMarketPageDto): string {
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('Country Market metadata scope mismatch')
  }
  const expected = new URL(page.identity.path, site.url).href
  if (expected !== page.seo.canonical) throw new Error('Country Market canonical mismatch')
  return expected
}

export function buildMalaysiaCountryMarketMetadata(
  site: SiteConfig,
  page: MalaysiaCountryMarketPageDto,
): Metadata {
  const url = canonical(site, page)
  return {
    title: page.seo.title,
    description: page.seo.metaDescription,
    alternates: {canonical: url},
    robots: {index: false, follow: false},
    openGraph: {
      type: 'website', url, siteName: site.name, title: page.seo.ogTitle,
      description: page.seo.metaDescription, images: [],
    },
    twitter: {
      card: 'summary', title: page.seo.title, description: page.seo.metaDescription, images: [],
    },
  }
}

export function buildMalaysiaCountryMarketJsonLd(
  site: SiteConfig,
  page: MalaysiaCountryMarketPageDto,
): JsonLdObject {
  const url = canonical(site, page)
  const breadcrumbId = `${url}#breadcrumb`
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebPage', '@id': `${url}#webpage`, url,
        name: page.modules[0].heading, description: page.seo.metaDescription, inLanguage: 'en',
        isPartOf: {'@id': new URL('/#website', site.url).href},
        publisher: {'@id': new URL('/#organization', site.url).href},
        breadcrumb: {'@id': breadcrumbId},
      },
      {
        '@type': 'BreadcrumbList', '@id': breadcrumbId,
        itemListElement: page.breadcrumb.map((item, index) => ({
          '@type': 'ListItem', position: index + 1, name: item.label,
          item: new URL(item.href, site.url).href,
        })),
      },
    ],
  }
}
