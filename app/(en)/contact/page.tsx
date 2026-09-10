import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaContactPage} from '@/components/sites/tio2-my/contact/malaysia-contact-page'
import {buildMalaysiaContactPageJsonLd, serializeMalaysiaContactPageJsonLd} from '@/lib/seo/contact-page-jsonld'
import {buildMalaysiaContactPageMetadata} from '@/lib/seo/contact-page-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaContactPage} from '@/lib/wordpress/contact-page-v01-queries'

export const revalidate = 3600

async function loadContactPage() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my') notFound()
  const page = await getMalaysiaContactPage()
  return {site, page}
}

export async function generateMetadata(): Promise<Metadata> {
  const {site, page} = await loadContactPage()
  return buildMalaysiaContactPageMetadata(site, page)
}

export default async function ContactPageRoute() {
  const {site, page} = await loadContactPage()
  const jsonLd = serializeMalaysiaContactPageJsonLd(buildMalaysiaContactPageJsonLd(site, page))
  return <MalaysiaContactPage page={page} form={null} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />} />
}
