import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaDocumentsHub} from '@/components/sites/tio2-my/documents/malaysia-documents-hub'
import {buildMalaysiaDocumentsHubJsonLd, serializeMalaysiaDocumentsHubJsonLd} from '@/lib/seo/documents-hub-jsonld'
import {buildMalaysiaDocumentsHubMetadata} from '@/lib/seo/documents-hub-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaDocumentsHub} from '@/lib/wordpress/documents-hub-v01-queries'

export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  const documentsHub = await getMalaysiaDocumentsHub()
  return {site, documentsHub}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, documentsHub} = await loadPage()
  return buildMalaysiaDocumentsHubMetadata(site, documentsHub)
}

export default async function DocumentsPage() {
  const {site, documentsHub} = await loadPage()
  const jsonLd = serializeMalaysiaDocumentsHubJsonLd(buildMalaysiaDocumentsHubJsonLd(site, documentsHub))
  return <MalaysiaDocumentsHub documentsHub={documentsHub} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />} />
}
