import type {Metadata} from 'next'

import type {MalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'

export function buildMalaysiaEuMarketMetadata(
  site: SiteConfig,
  marketPage: MalaysiaEuMarketPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || marketPage.identity.siteId !== 'tio2-my') {
    throw new Error('MARKET-EU-001 metadata is available only for tio2-my')
  }
  const canonical = new URL('/markets/european-union/', site.url).href
  if (canonical !== marketPage.seo.canonical) {
    throw new Error('MARKET-EU-001 canonical does not match the Malaysia site')
  }
  return buildTio2MyPublicationMetadata('MARKET-EU-001', env)
}
