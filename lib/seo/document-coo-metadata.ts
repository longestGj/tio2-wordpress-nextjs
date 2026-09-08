import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {MalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-types'

export function buildDocumentCooMetadata(site: SiteConfig, page: MalaysiaDocumentCooDto): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteScope !== 'tio2-my') {
    throw new Error('DOC-COO metadata is available only for tio2-my')
  }
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical: page.seo.canonical},
    robots: {index: false, follow: false},
  }
}
