import type {Metadata} from 'next'

import type {MalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaDocumentsHubMetadata(
  site: SiteConfig,
  hub: MalaysiaDocumentsHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || hub.identity.siteId !== 'tio2-my') throw new Error('DOC-000 metadata is available only for tio2-my')
  const canonical = new URL('/documents/', site.url).href
  const indexable = hub.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  return {
    title: hub.seo.title,
    description: hub.seo.description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {type: 'website', url: canonical, siteName: site.name, title: hub.seo.title, description: hub.seo.description, images: []},
    twitter: {card: 'summary', title: hub.seo.title, description: hub.seo.description, images: []},
  }
}
