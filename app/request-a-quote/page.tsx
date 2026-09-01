import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaRfqPage} from '@/components/sites/tio2-my/request-a-quote/malaysia-rfq-page'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {resolveMalaysiaRfqRuntime} from '@/lib/rfq/malaysia-rfq-runtime'
import {buildMalaysiaRfqJsonLd, serializeMalaysiaRfqJsonLd} from '@/lib/seo/rfq-jsonld'
import {buildMalaysiaRfqMetadata} from '@/lib/seo/rfq-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRfqPage} from '@/lib/wordpress/rfq-page-v01-queries'

export const revalidate = 3600

interface RfqRouteProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

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

export default async function RequestAQuoteRoute({searchParams}: RfqRouteProps) {
  const [{site, page}, query] = await Promise.all([loadRfqPage(), searchParams])
  const prefill = resolveMalaysiaRfqPrefill({
    grade_id: query.grade_id,
    application_id: query.application_id,
    destination_country: query.destination_country,
    market_id: query.market_id,
    process_context: query.process_context,
    document_needs: query['document_needs[]'] ?? query.document_needs,
    resource_context: query.resource_context,
    source_page_id: query.source_page_id,
  })
  const runtime = resolveMalaysiaRfqRuntime()
  const jsonLd = serializeMalaysiaRfqJsonLd(buildMalaysiaRfqJsonLd(site))
  return (
    <MalaysiaRfqPage
      page={page}
      prefill={prefill}
      receiverAccessKey={runtime.receiverAccessKey}
      privacyPolicyHref={runtime.privacyPolicyHref}
      structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
    />
  )
}
