import type {Metadata} from 'next'

import type {MalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-types'
import type {SiteConfig} from '@/sites'
import {buildTio2MyPublicationMetadata} from './tio2-my-publication-metadata'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaAboutPageMetadata(
  site: SiteConfig,
  page: MalaysiaAboutPageDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || page.identity.siteId !== 'tio2-my') {
    throw new Error('ABOUT-001 metadata is available only for tio2-my')
  }
  if (page.evidence.state !== 'sufficient') {
    const canonical = new URL('/about/', site.url).href
    const description = page.seo.description
    const indexable = isPublicIndexingEnabled(env) && page.releaseControls.indexingAuthorized
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
  return buildTio2MyPublicationMetadata('ABOUT-001', env)
}
