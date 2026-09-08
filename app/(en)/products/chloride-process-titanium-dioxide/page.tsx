import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaChlorideProcessPage} from '@/components/sites/tio2-my/products/malaysia-chloride-process-page'
import {buildMalaysiaChlorideProcessJsonLd, serializeMalaysiaChlorideProcessJsonLd} from '@/lib/seo/product-process-chloride-jsonld'
import {buildMalaysiaChlorideProcessMetadata} from '@/lib/seo/product-process-chloride-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaChlorideProcessPage} from '@/lib/wordpress/product-process-chloride-v01-queries'
import {loadMalaysiaChlorideProcessRequest} from '@/lib/wordpress/product-process-chloride-v01-registry'

const PATH = '/products/chloride-process-titanium-dioxide/'
export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  const page = await loadMalaysiaChlorideProcessRequest(
    site.id, site.wordpressScope, PATH, () => getMalaysiaChlorideProcessPage(),
  )
  if (!page) notFound()
  return {page, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const {page, site} = await loadPage()
  return buildMalaysiaChlorideProcessMetadata(site, page)
}

export default async function ChlorideProcessRoute() {
  const {page, site} = await loadPage()
  const jsonLd = serializeMalaysiaChlorideProcessJsonLd(
    buildMalaysiaChlorideProcessJsonLd(site, page),
  )
  return <>
    <meta property="og:title" content={page.seo.title} />
    <meta property="og:description" content={page.seo.description} />
    <meta property="og:url" content={page.seo.canonical} />
    <meta property="og:type" content="website" />
    <MalaysiaChlorideProcessPage page={page} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />} />
  </>
}
