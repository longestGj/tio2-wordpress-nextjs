import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaEuMarketPage} from '@/components/sites/tio2-my/markets/malaysia-eu-market-page'
import {
  buildMalaysiaEuMarketJsonLd,
  serializeMalaysiaEuMarketJsonLd,
} from '@/lib/seo/market-page-jsonld'
import {buildMalaysiaEuMarketMetadata} from '@/lib/seo/market-page-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaEuMarketPage} from '@/lib/wordpress/market-page-v01-queries'

export const revalidate = 3600

async function getRequestMarketPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  const marketPage = await getMalaysiaEuMarketPage()
  return {site, marketPage}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, marketPage} = await getRequestMarketPage()
  return buildMalaysiaEuMarketMetadata(site, marketPage)
}

export default async function EuropeanUnionMarketRoute() {
  const {site, marketPage} = await getRequestMarketPage()
  const jsonLd = serializeMalaysiaEuMarketJsonLd(
    buildMalaysiaEuMarketJsonLd(site, marketPage),
  )
  return (
    <MalaysiaEuMarketPage
      marketPage={marketPage}
      structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
    />
  )
}
