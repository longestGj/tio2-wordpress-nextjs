import type {Metadata} from 'next'

import type {MalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaProductHubMetadata(
  site: SiteConfig,
  productHub: MalaysiaProductHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || productHub.identity.siteId !== 'tio2-my') {
    throw new Error('PRODUCT-000 metadata is available only for tio2-my')
  }

  return buildTio2MyPublicationMetadata('PRODUCT-000', env)
}
