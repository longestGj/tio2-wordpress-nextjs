import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {notFound} from 'next/navigation'

import {MalaysiaDocumentReachPage} from '@/components/sites/tio2-my/documents/document-reach-page'
import {toDocumentReachRenderModel} from '@/lib/documents/document-reach-render-model'
import {buildDocumentReachJsonLd, serializeDocumentReachJsonLd} from '@/lib/seo/document-reach-jsonld'
import {buildDocumentReachMetadata} from '@/lib/seo/document-reach-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaDocumentReach} from '@/lib/wordpress/document-reach-v01-queries'

export const revalidate = 3600

const inter = Inter({subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], display: 'swap', variable: '--font-doc-reach'})

async function loadPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return {site, page: await getMalaysiaDocumentReach()}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadPage()
  return buildDocumentReachMetadata(site, page)
}

export default async function DocumentReachRoute() {
  const {site, page} = await loadPage()
  const jsonLd = serializeDocumentReachJsonLd(buildDocumentReachJsonLd(site, page))
  return <MalaysiaDocumentReachPage
    page={toDocumentReachRenderModel(page)} fontClassName={inter.variable}
    structuredData={<script key="doc-reach-jsonld" type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
  />
}
