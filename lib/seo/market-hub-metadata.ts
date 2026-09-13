import type {Metadata} from 'next'

import type {MalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaMarketHubMetadata(
  site: SiteConfig,
  marketHub: MalaysiaMarketHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || marketHub.identity.siteId !== 'tio2-my') {
    throw new Error('MARKET-000 metadata is available only for tio2-my')
  }
  return buildTio2MyPublicationMetadata('MARKET-000', env)
}
