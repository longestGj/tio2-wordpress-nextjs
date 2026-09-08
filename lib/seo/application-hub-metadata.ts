import type {Metadata} from 'next'

import type {MalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'

export function buildMalaysiaApplicationHubMetadata(
  site: SiteConfig,
  applicationHub: MalaysiaApplicationHubDto,
  env: Readonly<Record<string, string | undefined>> = process.env,
): Metadata {
  if (site.id !== 'tio2-my' || applicationHub.identity.siteId !== 'tio2-my') {
    throw new Error('APP-000 metadata is available only for tio2-my')
  }
  const canonical = new URL('/applications/', site.url).href
  const indexable = applicationHub.releaseControls.indexingAuthorized && isPublicIndexingEnabled(env)
  return {
    title: applicationHub.seo.title,
    description: applicationHub.seo.description,
    alternates: {canonical},
    robots: {index: indexable, follow: indexable},
    openGraph: {
      type: 'website', url: canonical, siteName: site.name,
      title: applicationHub.seo.title, description: applicationHub.seo.description,
      images: [],
    },
  }
}

