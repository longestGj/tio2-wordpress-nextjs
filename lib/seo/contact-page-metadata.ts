import type {Metadata} from 'next'

import type {MalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-types'
import type {SiteConfig} from '@/sites'

export function buildMalaysiaContactPageMetadata(
  site: SiteConfig,
  page: MalaysiaContactPageDto,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('CONTACT-001 metadata is available only for tio2-my')
  }

  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical: page.seo.canonical},
    robots: {index: true, follow: true},
    openGraph: {
      type: 'website',
      url: page.seo.canonical,
      siteName: site.name,
      title: page.seo.openGraphTitle,
      description: page.seo.description,
      images: [],
    },
  }
}
