import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-types'
import type {JsonLdObject} from './jsonld'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

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
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  canonical(site, page)
  return buildTio2MyPublicationMetadata(page.identity.pageId, env)
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
