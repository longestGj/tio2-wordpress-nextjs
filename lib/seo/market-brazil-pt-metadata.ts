import type {Metadata} from 'next'
import type {SiteConfig} from '@/sites'
import type {MalaysiaBrazilPtMarketPageDto} from '@/lib/wordpress/market-page-brazil-pt-v02-types'
import type {JsonLdObject} from './jsonld'

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

export function buildMalaysiaBrazilPtMarketMetadata(site: SiteConfig, page: MalaysiaBrazilPtMarketPageDto): Metadata {
  const url = canonical(site, page)
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical: url},
    robots: {index: false, follow: false},
    openGraph: {
      type: 'website', locale: 'pt_BR', url, siteName: site.name,
      title: page.seo.title, description: page.seo.description, images: [],
    },
    twitter: {card: 'summary', title: page.seo.title, description: page.seo.description, images: []},
  }
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
