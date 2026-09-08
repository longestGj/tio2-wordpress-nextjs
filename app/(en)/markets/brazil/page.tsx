import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaBrazilEnMarketPage} from '@/lib/wordpress/market-page-brazil-en-v01-queries'
import {buildMalaysiaBrazilEnMarketJsonLd, buildMalaysiaBrazilEnMarketMetadata} from '@/lib/seo/market-brazil-en-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {MalaysiaBrazilEnMarketPage} from '@/components/sites/tio2-my/markets/malaysia-brazil-en-market-page'

export const revalidate = 3600
async function requestPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaBrazilEnMarketPage()}
}
export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await requestPage()
  return buildMalaysiaBrazilEnMarketMetadata(site, page)
}
export default async function BrazilEnglishMarketRoute() {
  const {site, page} = await requestPage()
  return <MalaysiaBrazilEnMarketPage marketPage={page} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: serializeJsonLd(buildMalaysiaBrazilEnMarketJsonLd(site, page))}}/>}/>
}
