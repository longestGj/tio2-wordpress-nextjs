import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaMarketHub} from '@/components/sites/tio2-my/markets/malaysia-market-hub'
import {
  buildMalaysiaMarketHubJsonLd,
  serializeMalaysiaMarketHubJsonLd,
} from '@/lib/seo/market-hub-jsonld'
import {buildMalaysiaMarketHubMetadata} from '@/lib/seo/market-hub-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaMarketHub} from '@/lib/wordpress/market-hub-v01-queries'

export const revalidate = 3600

async function getRequestMarketHub() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my') notFound()
  const marketHub = await getMalaysiaMarketHub()
  return {site, marketHub}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, marketHub} = await getRequestMarketHub()
  return buildMalaysiaMarketHubMetadata(site, marketHub)
}

export default async function MarketsPage() {
  const {site, marketHub} = await getRequestMarketHub()
  const jsonLd = serializeMalaysiaMarketHubJsonLd(
    buildMalaysiaMarketHubJsonLd(site, marketHub),
  )

  return (
    <MalaysiaMarketHub
      marketHub={marketHub}
      structuredData={(
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: jsonLd}}
        />
      )}
    />
  )
}
