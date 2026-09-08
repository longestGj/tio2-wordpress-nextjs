import type {Metadata} from 'next'

import type {MalaysiaChlorideProcessPageDto} from '@/lib/wordpress/product-process-chloride-v01-types'
import type {SiteConfig} from '@/sites'

export function buildMalaysiaChlorideProcessMetadata(
  site: SiteConfig,
  page: MalaysiaChlorideProcessPageDto,
): Metadata {
  if (
    site.id !== 'tio2-my' ||
    page.identity.siteScope !== 'tio2-my' ||
    page.identity.pageId !== 'PRODUCT-PROC-CL'
  ) {
    throw new Error('PRODUCT-PROC-CL metadata is available only for tio2-my')
  }
  return {
    title: page.seo.title,
    description: page.seo.description,
    alternates: {canonical: page.seo.canonical},
    robots: {index: false, follow: false},
    other: {
      'twitter:title': page.seo.title,
      'twitter:description': page.seo.description,
    },
  }
}
