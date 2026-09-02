import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaLegalPage} from '@/components/sites/tio2-my/legal/malaysia-legal-page'
import {buildMalaysiaLegalPageJsonLd, serializeMalaysiaLegalPageJsonLd} from '@/lib/seo/legal-page-jsonld'
import {buildMalaysiaLegalPageMetadata} from '@/lib/seo/legal-page-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaLegalPage} from '@/lib/wordpress/legal-pages-v01-queries'

export const revalidate = 3600
async function load() { const site = getCurrentSite(); if (site.id !== 'tio2-my') notFound(); return {site, page: await getMalaysiaLegalPage('LEGAL-PRIV-MS')} }
export async function generateMetadata(): Promise<Metadata> { const {site, page} = await load(); return buildMalaysiaLegalPageMetadata(site, page) }
export default async function DasarPrivasiPage() { const {site, page} = await load(); const json = serializeMalaysiaLegalPageJsonLd(buildMalaysiaLegalPageJsonLd(site, page)); return <MalaysiaLegalPage page={page} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: json}} />} /> }
