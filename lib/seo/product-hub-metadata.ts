import type {Metadata} from 'next'

import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaProductHubMetadata(
  site: SiteConfig,
  productHub: MalaysiaProductHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || productHub.identity.siteId !== 'tio2-my') {
    throw new Error('PRODUCT-000 metadata is available only for tio2-my')
  }

  const canonical = new URL('/products/', site.url).href
  const indexable =
    productHub.releaseControls.indexingAuthorized &&
    isPublicIndexingEnabled(env)

  return {
    title: productHub.seo.title,
    description: productHub.seo.description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: productHub.seo.title,
      description: productHub.seo.description,
      images: [],
    },
  }
}
