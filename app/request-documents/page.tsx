import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaRequestDocumentsPage} from '@/components/sites/tio2-my/request-documents/malaysia-request-documents-page'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'
import {buildMalaysiaRequestDocumentsJsonLd, serializeMalaysiaRequestDocumentsJsonLd} from '@/lib/seo/request-documents-jsonld'
import {buildMalaysiaRequestDocumentsMetadata} from '@/lib/seo/request-documents-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaRequestDocumentsPage} from '@/lib/wordpress/request-documents-v01-queries'

export const revalidate = 3600

interface RouteProps {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>
}

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

export default async function RequestDocumentsRoute({searchParams}: RouteProps) {
  const [{site, page}, query] = await Promise.all([loadPage(), searchParams])
  const prefill = resolveMalaysiaRequestDocumentsPrefill({
    product_grade: query.product_grade ?? query.product,
    application_industry: query.application_industry,
    document_types: query['document_types[]'] ?? query.document_types,
    source_page_id: query.source_page_id,
    market_id: query.market_id,
    country_region: query.country_region,
  })
  const jsonLd = serializeMalaysiaRequestDocumentsJsonLd(buildMalaysiaRequestDocumentsJsonLd(site))
  return <MalaysiaRequestDocumentsPage
    page={page}
    prefill={prefill}
    structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
  />
}
