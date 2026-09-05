import type {Metadata} from 'next'

import type {MalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-types'
import type {SiteConfig} from '@/sites'

export function buildDocumentReachMetadata(site: SiteConfig, page: MalaysiaDocumentReachDto): Metadata {
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-REACH metadata is available only for tio2-my')
  }
  const canonical = new URL('/documents/reach/', site.url).href
  return {
    title: page.seo.title,
    description: page.seo.meta_description,
    alternates: {canonical},
    robots: {index: false, follow: false},
    openGraph: {
      type: 'website', url: canonical, siteName: site.name,
      title: page.seo.title, description: page.seo.meta_description, images: [],
    },
    twitter: {card: 'summary', title: page.seo.title, description: page.seo.meta_description, images: []},
  }
}
