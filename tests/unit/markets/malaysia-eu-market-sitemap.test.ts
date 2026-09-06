import {describe, expect, it} from 'vitest'

import {buildSitemap} from '@/app/sitemap'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {toMalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-dto'
import {getSiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import approvedHomepage from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
import approvedMarket from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

function homepage() {
  return toMalaysiaHomepageDto({
    id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
    malaysiaHomepageContractJson: JSON.stringify(approvedHomepage),
  })
}

function market(released: boolean) {
  const contract = structuredClone(approvedMarket)
  Object.assign(contract.releaseControls, {
    originHold: released ? 'CLOSED' : 'OPEN',
    relatedRoutesReady: released,
    conversionRuntimeReady: released,
    runtimeAcceptanceReady: released,
    releaseEnabled: released,
    indexingAuthorized: released,
    sitemapAuthorized: released,
  })
  const page = toMalaysiaEuMarketPageDto({
    id: 'market-eu-001-my-1', modifiedGmt: '2026-09-04T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/european-union'},
    malaysiaEuMarketContractJson: JSON.stringify(contract),
  })
  if (released) {
    for (const relation of Object.values(page.relations)) {
      ;(relation as {routeState: string}).routeState = 'available'
    }
    for (const item of [...page.applications.items, ...page.destinations.items]) {
      ;(item as {routeState: string}).routeState = 'available'
    }
  }
  return page
}

const baseSources = {
  getHomepage: async () => homepage(),
  getSiteProductPage: async () => null,
  getPublicRoutes,
  getSiteTemplateProfile,
}

describe('MARKET-EU-001 sitemap authorization', () => {
  it('omits the page while release controls remain blocked', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'), {
      ...baseSources,
      getMalaysiaEuMarketPage: async () => market(false),
    })
    expect(JSON.stringify(sitemap)).not.toContain('/markets/european-union')
  })

  it('has an explicit future inclusion path gated by all release controls', async () => {
    const sitemap = await buildSitemap(getSiteConfig('tio2-my'), {
      ...baseSources,
      getMalaysiaEuMarketPage: async () => market(true),
    })
    expect(sitemap).toContainEqual({
      url: 'https://tio2malaysia.com/markets/european-union/',
      lastModified: new Date('2026-09-04T01:02:03.000Z'),
    })
  })
})
