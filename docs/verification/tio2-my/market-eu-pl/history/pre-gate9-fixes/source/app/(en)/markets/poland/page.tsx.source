import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {notFound} from 'next/navigation'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaPolandMarketPage} from '@/lib/wordpress/market-page-poland-v01-queries'
import {buildMalaysiaPolandMarketMetadata, buildMalaysiaPolandMarketJsonLd} from '@/lib/seo/market-poland-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {MalaysiaPolandMarketPage} from '@/components/sites/tio2-my/markets/malaysia-poland-market-page'
const inter = Inter({subsets:['latin'],weight:['400','500','600','700'],display:'swap',variable:'--font-poland'})
export const revalidate = 3600
async function requestPage() {
  const site=getCurrentSite()
  if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my')notFound()
  return {site, page:await getMalaysiaPolandMarketPage()}
}
export async function generateMetadata(): Promise<Metadata> {
  const {site,page}=await requestPage()
  return buildMalaysiaPolandMarketMetadata(site,page)
}
export default async function PolandMarketRoute() {
  const {site,page}=await requestPage()
  return <MalaysiaPolandMarketPage marketPage={page} fontClassName={inter.variable} structuredData={
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(buildMalaysiaPolandMarketJsonLd(site,page))}}/>
  }/>
}
