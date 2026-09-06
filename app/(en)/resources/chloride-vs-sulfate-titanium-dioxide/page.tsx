import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaResourceProcPage} from '@/components/sites/tio2-my/resources/malaysia-resource-proc-page'
import {
  buildMalaysiaResourceProcJsonLd,
  serializeMalaysiaResourceProcJsonLd,
} from '@/lib/seo/resource-proc-jsonld'
import {buildMalaysiaResourceProcMetadata} from '@/lib/seo/resource-proc-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {loadMalaysiaResourcePageRequest} from '@/lib/wordpress/resource-page-registry'
import {getMalaysiaResourceProc} from '@/lib/wordpress/resource-proc-v01-queries'

const PATH = '/resources/chloride-vs-sulfate-titanium-dioxide/'

export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  const page = await loadMalaysiaResourcePageRequest(
    site.id,
    site.wordpressScope,
    PATH,
    () => getMalaysiaResourceProc(),
  )
  if (!page) notFound()
  return {page, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const {page, site} = await loadPage()
  return buildMalaysiaResourceProcMetadata(site, page)
}

export default async function MalaysiaResourceProcRoute() {
  const {page, site} = await loadPage()
  const jsonLd = serializeMalaysiaResourceProcJsonLd(
    buildMalaysiaResourceProcJsonLd(site, page),
  )
  return (
    <MalaysiaResourceProcPage
      page={page}
      structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
    />
  )
}
