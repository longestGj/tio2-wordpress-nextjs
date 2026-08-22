import {getSiteConfig} from '@/sites'
import type {SiteConfig} from '@/sites'

export function getCurrentSite(
  env: Partial<NodeJS.ProcessEnv> = process.env,
): SiteConfig {
  const siteId = env.SITE_ID

  if (!siteId?.trim()) {
    throw new Error('SITE_ID is required')
  }

  return getSiteConfig(siteId)
}
