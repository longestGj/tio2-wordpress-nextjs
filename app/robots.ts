import type {MetadataRoute} from 'next'

import {isPublicIndexingEnabled} from '@/lib/seo/metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import type {SiteConfig} from '@/sites'

type RobotsEnvironment = Parameters<typeof isPublicIndexingEnabled>[0]

export function buildRobots(
  site: SiteConfig,
  env: RobotsEnvironment = process.env,
): MetadataRoute.Robots {
  const origin = new URL('/', site.url).origin

  return {
    rules: isPublicIndexingEnabled(env)
      ? [{userAgent: '*', allow: '/', disallow: ['/api/', '/preview/']}]
      : [{userAgent: '*', disallow: '/'}],
    host: origin,
    sitemap: `${origin}/sitemap.xml`,
  }
}

export default function robots(): MetadataRoute.Robots {
  return buildRobots(getCurrentSite())
}
