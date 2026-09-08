import {notFound} from 'next/navigation'

import {MalaysiaCountryMarketPage} from '@/components/sites/tio2-my/markets/malaysia-country-market-page'
import {buildMalaysiaCountryMarketJsonLd, buildMalaysiaCountryMarketMetadata} from '@/lib/seo/market-country-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaCountryMarketPage} from '@/lib/wordpress/market-country-v01-queries'
import type {MalaysiaCountryMarketPageId} from './malaysia-country-market-contracts'

async function requestPage(pageId: MalaysiaCountryMarketPageId) {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaCountryMarketPage(pageId)}
}

export async function generateMalaysiaCountryMarketMetadata(pageId: MalaysiaCountryMarketPageId) {
  const {site, page} = await requestPage(pageId)
  return buildMalaysiaCountryMarketMetadata(site, page)
}

export async function renderMalaysiaCountryMarketRoute(pageId: MalaysiaCountryMarketPageId) {
  const {site, page} = await requestPage(pageId)
  return <MalaysiaCountryMarketPage marketPage={page} structuredData={
    <script type="application/ld+json" dangerouslySetInnerHTML={{
      __html: serializeJsonLd(buildMalaysiaCountryMarketJsonLd(site, page)),
    }} />
  } />
}
