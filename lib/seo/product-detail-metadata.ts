import type {Metadata} from 'next'

import type {MalaysiaProductDetailDto} from '@/lib/wordpress/product-detail-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaProductDetailMetadata(
  site: SiteConfig,
  product: MalaysiaProductDetailDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || product.identity.siteId !== 'tio2-my') {
    throw new Error('Malaysia Product Detail metadata is available only for tio2-my')
  }
  const canonical = new URL(`${product.identity.path}/`, site.url).href
  if (canonical !== product.seo.canonical) {
    throw new Error('Malaysia Product Detail canonical does not match its scoped identity')
  }
  return buildTio2MyPublicationMetadata(product.identity.pageId, env)
}
