import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaAboutPage} from '@/components/sites/tio2-my/about/malaysia-about-page'
import {buildMalaysiaAboutPageJsonLd, serializeMalaysiaAboutPageJsonLd} from '@/lib/seo/about-page-jsonld'
import {buildMalaysiaAboutPageMetadata} from '@/lib/seo/about-page-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaAboutPage} from '@/lib/wordpress/about-page-v01-queries'

export const revalidate = 3600

async function loadAboutPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my') notFound()
  const page = await getMalaysiaAboutPage()
  return {site, page}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadAboutPage()
  return buildMalaysiaAboutPageMetadata(site, page)
}

export default async function AboutPageRoute() {
  const {site, page} = await loadAboutPage()
  const jsonLd = serializeMalaysiaAboutPageJsonLd(buildMalaysiaAboutPageJsonLd(site, page))
  return (
    <MalaysiaAboutPage
      aboutPage={page}
      structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />}
    />
  )
}
