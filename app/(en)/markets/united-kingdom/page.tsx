import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {notFound} from 'next/navigation'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaUkMarketPage} from '@/lib/wordpress/market-page-uk-v01-queries'
import {buildMalaysiaUkMarketMetadata, buildMalaysiaUkMarketJsonLd} from '@/lib/seo/market-uk-metadata'
import {serializeJsonLd} from '@/lib/seo/jsonld'
import {MalaysiaUkMarketPage} from '@/components/sites/tio2-my/markets/malaysia-uk-market-page'
const inter = Inter({subsets:['latin'],weight:['400','500','600','700'],display:'swap',variable:'--font-market-uk'})
export const revalidate = 3600
async function requestPage() {
  const site=getCurrentSite()
  if(site.id!=='tio2-my'||site.wordpressScope!=='tio2-my')notFound()
  return {site, page:await getMalaysiaUkMarketPage()}
}
export async function generateMetadata(): Promise<Metadata> {
  const {site,page}=await requestPage()
  return buildMalaysiaUkMarketMetadata(site,page)
}
export default async function UnitedKingdomMarketRoute() {
  const {site,page}=await requestPage()
  return <MalaysiaUkMarketPage marketPage={page} fontClassName={inter.variable} structuredData={
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:serializeJsonLd(buildMalaysiaUkMarketJsonLd(site,page))}}/>
  }/>
}
