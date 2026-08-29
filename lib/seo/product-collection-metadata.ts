import type {Metadata} from 'next'

import type {ProductFamilyPageDto, ProductsHubPageDto} from '@/lib/products/page-types'
import type {SiteConfig} from '@/sites'

import {htmlToPlainText} from './text'

export function buildProductCollectionMetadata(
  page: ProductsHubPageDto | ProductFamilyPageDto,
  site: SiteConfig,
): Metadata {
  const canonical = new URL(page.identity.path, site.url).href
  const title = htmlToPlainText(page.seo.title, 100)
  const description = htmlToPlainText(page.seo.description, 220)
  return {
    title,
    description,
    alternates: {canonical},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: htmlToPlainText(site.name, 60),
      title,
      description,
    },
  }
}
