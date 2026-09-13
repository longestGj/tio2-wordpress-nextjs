import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {MalaysiaBrazilPtMarketPageDto} from '@/lib/wordpress/market-page-brazil-pt-v02-types'
import type {JsonLdObject} from './jsonld'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

function canonical(site: SiteConfig, page: MalaysiaBrazilPtMarketPageDto): string {
  if (
    site.id !== 'tio2-my' ||
    site.wordpressScope !== 'tio2-my' ||
    page.identity.siteScope !== 'tio2-my' ||
    page.identity.locale !== 'pt-BR' ||
    new URL(page.identity.path, site.url).href !== page.seo.canonical
  ) throw new Error('Brazil Portuguese metadata scope mismatch')
  return page.seo.canonical
}

export function buildMalaysiaBrazilPtMarketMetadata(site: SiteConfig, page: MalaysiaBrazilPtMarketPageDto, env: Readonly<Record<string,string|undefined>> = process.env): Metadata {
  canonical(site, page)
  return buildTio2MyPublicationMetadata('MARKET-BR-PT', env)
}

export function buildMalaysiaBrazilPtMarketJsonLd(site: SiteConfig, page: MalaysiaBrazilPtMarketPageDto): JsonLdObject {
  const url = canonical(site, page)
  return {'@context': 'https://schema.org', '@graph': [
    {
      '@type': 'WebPage', '@id': `${url}#webpage`, url,
      name: page.modules[0]!.heading, description: page.seo.description, inLanguage: 'pt-BR',
      isPartOf: {'@id': new URL('/#website', site.url).href},
      publisher: {'@id': new URL('/#organization', site.url).href},
      breadcrumb: {'@id': `${url}#breadcrumb`},
    },
    {
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: page.breadcrumb.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.label, item: new URL(item.href, site.url).href,
      })),
    },
  ]}
}
