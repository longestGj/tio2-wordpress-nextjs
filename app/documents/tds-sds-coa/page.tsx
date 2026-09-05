import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {notFound} from 'next/navigation'

import {MalaysiaDocumentTdsPage} from '@/components/sites/tio2-my/documents/document-tds-page'
import {buildDocumentTdsJsonLd, serializeDocumentTdsJsonLd} from '@/lib/seo/document-tds-jsonld'
import {buildDocumentTdsMetadata} from '@/lib/seo/document-tds-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {toDocumentTdsRenderModel} from '@/lib/documents/document-tds-render-model'
import {getMalaysiaDocumentTds} from '@/lib/wordpress/document-tds-v01-queries'

export const revalidate = 3600

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-doc-tds',
})

async function loadPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaDocumentTds()}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadPage()
  return buildDocumentTdsMetadata(site, page)
}

export default async function DocumentTdsRoute() {
  const {site, page} = await loadPage()
  const jsonLd = serializeDocumentTdsJsonLd(buildDocumentTdsJsonLd(site, page))
  return <MalaysiaDocumentTdsPage
    page={toDocumentTdsRenderModel(page)}
    fontClassName={inter.variable}
    structuredData={<script key="doc-tds-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
  />
}
