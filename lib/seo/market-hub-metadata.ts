import type {Metadata} from 'next'

import type {MalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaMarketHubMetadata(
  site: SiteConfig,
  marketHub: MalaysiaMarketHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || marketHub.identity.siteId !== 'tio2-my') {
    throw new Error('MARKET-000 metadata is available only for tio2-my')
  }
  const canonical = new URL('/markets/', site.url).href
  const description = marketHub.releaseControls.firstLevelRoutesApproved
    ? marketHub.seo.fullRouteDescription
    : marketHub.seo.routeSafeDescription
  const indexable =
    marketHub.releaseControls.indexingAuthorized &&
    isPublicIndexingEnabled(env)

  return {
    title: marketHub.seo.title,
    description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: marketHub.hero.h1,
      description,
      images: [],
    },
  }
}
