import type {Metadata} from 'next'

import type {MalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaResourceHubMetadata(
  site: SiteConfig,
  resourceHub: MalaysiaResourceHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || resourceHub.identity.siteId !== 'tio2-my') {
    throw new Error('RES-000 metadata is available only for tio2-my')
  }
  const canonical = new URL('/resources/', site.url).href
  const indexable = resourceHub.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  return {
    title: resourceHub.seo.title,
    description: resourceHub.seo.description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website', url: canonical, siteName: site.name,
      title: resourceHub.seo.title, description: resourceHub.seo.description,
      images: [],
    },
  }
}
