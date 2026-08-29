import type {Metadata} from 'next'

import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'
import type {SiteConfig} from '@/sites'
import {htmlToPlainText} from './text'

export function buildProductMetadata(
  product: ProductPageDto | ProductDetailPageDto,
  site: SiteConfig,
): Metadata {
  const canonical = new URL(product.identity.path, site.url).href
  const title = htmlToPlainText(product.seo.title, 100)
  const description = htmlToPlainText(product.seo.description, 160)

  return {
    title,
    description,
    alternates: {canonical},
    openGraph: {
      type: 'article',
      url: canonical,
      siteName: htmlToPlainText(site.name, 60),
      title,
      description,
      ...('familySlug' in product.identity
        ? {}
        : {modifiedTime: product.identity.modified}),
    },
  }
}
