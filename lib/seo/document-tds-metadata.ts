import type {Metadata} from 'next'

import type {MalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-types'
import type {SiteConfig} from '@/sites'

export function buildDocumentTdsMetadata(
  site: SiteConfig,
  page: MalaysiaDocumentTdsDto,
  _env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  void _env
  if (site.id !== 'tio2-my' || page.page.site_scope !== 'tio2-my') {
    throw new Error('DOC-TDS metadata is available only for tio2-my')
  }
  const canonical = new URL('/documents/tds-sds-coa/', site.url).href
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
