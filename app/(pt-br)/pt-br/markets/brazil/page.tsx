import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {MalaysiaBrazilPtMarketPage} from '@/components/sites/tio2-my/markets/malaysia-brazil-pt-market-page'
import {getCurrentSite} from '@/lib/sites/current-site'
import {
  buildMalaysiaBrazilPtMarketJsonLd,
  buildMalaysiaBrazilPtMarketMetadata,
} from '@/lib/seo/market-brazil-pt-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {getMalaysiaBrazilPtMarketPage} from '@/lib/wordpress/market-page-brazil-pt-v02-queries'

export const revalidate = 3600

async function requestPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaBrazilPtMarketPage()}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await requestPage()
  return buildMalaysiaBrazilPtMarketMetadata(site, page)
}

export default async function BrazilPortugueseMarketRoute() {
  const {site, page} = await requestPage()
  return <MalaysiaBrazilPtMarketPage
    marketPage={page}
    structuredData={<script
      type="application/ld+json"
      dangerouslySetInnerHTML={{__html: serializeJsonLd(buildMalaysiaBrazilPtMarketJsonLd(site, page))}}
    />}
  />
}
