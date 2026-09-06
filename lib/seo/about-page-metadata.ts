import type {Metadata} from 'next'

import type {MalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaAboutPageMetadata(
  site: SiteConfig,
  page: MalaysiaAboutPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('ABOUT-001 metadata is available only for tio2-my')
  }
  const canonical = new URL('/about/', site.url).href
  const indexable = page.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  const description = page.seo.description
  return {
    title: page.seo.title,
    description: description ?? null,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website',
      url: canonical,
      siteName: site.name,
      title: page.seo.openGraphTitle,
      ...(description ? {description} : {}),
      images: [],
    },
  }
}
