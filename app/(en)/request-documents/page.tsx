import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaRequestDocumentsQueryPage} from '@/components/sites/tio2-my/request-documents/malaysia-request-documents-query-page'
import {buildMalaysiaRequestDocumentsJsonLd, serializeMalaysiaRequestDocumentsJsonLd} from '@/lib/seo/request-documents-jsonld'
import {buildMalaysiaRequestDocumentsMetadata} from '@/lib/seo/request-documents-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRequestDocumentsPage} from '@/lib/wordpress/request-documents-v01-queries'

export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaRequestDocumentsPage()}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadPage()
  return buildMalaysiaRequestDocumentsMetadata(site, {
    indexingAuthorized: page.releaseControls.indexingAuthorized,
    env: process.env,
  })
}

export default async function RequestDocumentsRoute() {
  const {site, page} = await loadPage()
  const jsonLd = serializeMalaysiaRequestDocumentsJsonLd(buildMalaysiaRequestDocumentsJsonLd(site))
  return <MalaysiaRequestDocumentsQueryPage
    page={page}
    structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
  />
}
