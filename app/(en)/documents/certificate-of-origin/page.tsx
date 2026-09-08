import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaDocumentCooPage} from '@/components/sites/tio2-my/documents/document-coo-page'
import {buildDocumentCooJsonLd, serializeDocumentCooJsonLd} from '@/lib/seo/document-coo-jsonld'
import {buildDocumentCooMetadata} from '@/lib/seo/document-coo-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaDocumentCoo} from '@/lib/wordpress/document-coo-v04-queries'

export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaDocumentCoo()}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadPage()
  return buildDocumentCooMetadata(site, page)
}

export default async function DocumentCooRoute() {
  const {site, page} = await loadPage()
  const jsonLd = serializeDocumentCooJsonLd(buildDocumentCooJsonLd(site, page))
  return <MalaysiaDocumentCooPage
    page={page}
    structuredData={<script key="doc-coo-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
  />
}
