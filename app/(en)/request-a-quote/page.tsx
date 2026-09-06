import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaRfqQueryPage} from '@/components/sites/tio2-my/request-a-quote/malaysia-rfq-query-page'
import {resolveMalaysiaRfqRuntime} from '@/lib/rfq/malaysia-rfq-runtime'
import {buildMalaysiaRfqJsonLd, serializeMalaysiaRfqJsonLd} from '@/lib/seo/rfq-jsonld'
import {buildMalaysiaRfqMetadata} from '@/lib/seo/rfq-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRfqPage} from '@/lib/wordpress/rfq-page-v01-queries'

export const revalidate = 3600

async function loadRfqPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  const page = await getMalaysiaRfqPage()
  return {site, page}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadRfqPage()
  return buildMalaysiaRfqMetadata(site, {
    indexingAuthorized: page.releaseControls.indexingAuthorized,
    env: process.env,
  })
}

export default async function RequestAQuoteRoute() {
  const {site, page} = await loadRfqPage()
  const runtime = resolveMalaysiaRfqRuntime()
  const jsonLd = serializeMalaysiaRfqJsonLd(buildMalaysiaRfqJsonLd(site))
  return (
    <MalaysiaRfqQueryPage
      page={page}
      receiverAccessKey={runtime.receiverAccessKey}
      privacyPolicyHref={runtime.privacyPolicyHref}
      structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
    />
  )
}
