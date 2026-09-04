import type {Metadata} from 'next'

import type {MalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-types'
import {
  getMalaysiaEuMarketRelatedRouteStates,
  projectMalaysiaEuMarketDynamicState,
} from '@/lib/markets/malaysia-eu-market-projection'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

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
  const dynamicState = projectMalaysiaEuMarketDynamicState({
    evidence: marketPage.trade.evidence ?? {},
    importEvidence: marketPage.importRoles.source ?? {},
    routeState: marketPage.relations.tradeUpdate.routeState,
    datedContext: marketPage.trade.datedContext,
    action: marketPage.relations.tradeUpdate,
    originHold: marketPage.releaseControls.originHold,
    releaseEnabled: marketPage.releaseControls.releaseEnabled,
    indexingAuthorized: marketPage.releaseControls.indexingAuthorized,
    relatedRoutesReady: marketPage.releaseControls.relatedRoutesReady,
    conversionRuntimeReady: marketPage.releaseControls.conversionRuntimeReady,
    runtimeAcceptanceReady: marketPage.releaseControls.runtimeAcceptanceReady,
    tradeFreshness: marketPage.releaseControls.tradeFreshness,
    relatedRouteStates: getMalaysiaEuMarketRelatedRouteStates(marketPage),
  })
  const indexable = dynamicState.canIndex && isPublicIndexingEnabled(env)

  return {
    title: marketPage.seo.title,
    description: marketPage.seo.metaDescription,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: marketPage.seo.ogTitle,
      description: marketPage.seo.ogDescription,
      images: [],
    },
  }
}
