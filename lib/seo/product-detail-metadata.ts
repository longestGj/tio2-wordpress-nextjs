import type {Metadata} from 'next'

import type {MalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaProductDetailMetadata(
  site: SiteConfig,
  product: MalaysiaProductDetailDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || product.identity.siteId !== 'tio2-my') {
    throw new Error('Malaysia Product Detail metadata is available only for tio2-my')
  }
  const canonical = new URL('/products/m-350/', site.url).href
  const indexable = product.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  return {
    title: product.seo.title,
    description: product.seo.description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: product.seo.title,
      description: product.seo.description,
      images: [],
    },
  }
}
