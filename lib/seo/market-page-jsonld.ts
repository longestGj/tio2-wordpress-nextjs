import type {MalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-types'
import {
  getMalaysiaEuMarketRelatedRouteStates,
  projectMalaysiaEuMarketDynamicState,
} from '@/lib/markets/malaysia-eu-market-projection'
import type {SiteConfig} from '@/sites'
import {serializeJsonLd} from './jsonld'
import type {JsonLdObject} from './jsonld'

export function buildMalaysiaEuMarketJsonLd(
  site: SiteConfig,
  marketPage: MalaysiaEuMarketPageDto,
): JsonLdObject {
  if (site.id !== 'tio2-my' || marketPage.identity.siteId !== 'tio2-my') {
    throw new Error('MARKET-EU-001 Schema is available only for tio2-my')
  }
  const canonical = new URL('/markets/european-union/', site.url).href
  if (canonical !== marketPage.seo.canonical) {
    throw new Error('MARKET-EU-001 Schema canonical does not match the Malaysia site')
  }
  const graph: JsonLdObject[] = [
    {
      '@type': 'WebPage',
      '@id': `${canonical}#webpage`,
      url: canonical,
      name: marketPage.hero.h1,
      description: marketPage.seo.metaDescription,
      inLanguage: 'en',
      isPartOf: {'@id': new URL('/#website', site.url).href},
    },
    {
      '@type': 'BreadcrumbList',
      '@id': `${canonical}#breadcrumb`,
      itemListElement: marketPage.breadcrumb.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.label,
        item: new URL(item.href, site.url).href,
      })),
    },
  ]
  const state = projectMalaysiaEuMarketDynamicState({
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
  if (state.canRelease && marketPage.destinations.items.length === 6 &&
    marketPage.destinations.items.every(({routeState}) => routeState === 'available')) {
    graph.push({
      '@type': 'ItemList',
      '@id': `${canonical}#destinations`,
      name: marketPage.destinations.h2,
      numberOfItems: 6,
      itemListElement: marketPage.destinations.items.map((item, index) => ({
        '@type': 'ListItem', position: index + 1, name: item.label,
        url: new URL(item.href, site.url).href,
      })),
    })
  }
  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

export function serializeMalaysiaEuMarketJsonLd(value: JsonLdObject): string {
  return serializeJsonLd(value)
}
