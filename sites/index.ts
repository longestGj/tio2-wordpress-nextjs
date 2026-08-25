import {tio2A} from './tio2-a'
import {tio2B} from './tio2-b'
import {assertSiteRfqHref} from './types'
import type {SiteConfig, SiteId} from './types'

export type {
  HomepageSchemaVersion,
  HomepageTemplateKey,
  PublicRouteDefinition,
  ShellTemplateKey,
  SiteConfig,
  SiteId,
  SiteTemplateProfile,
  TemplateState,
} from './types'
export {assertSiteRfqHref, SITE_IDS} from './types'
export {
  getExpectedPublicUrlCount,
  getPublicRoutes,
  isPublicRoute,
  parsePublicRouteInventory,
} from './public-routes'
export {getSiteTemplateProfile} from './template-profiles'

const siteConfigs: Readonly<Record<SiteId, SiteConfig>> = Object.freeze({
  'tio2-a': Object.freeze(tio2A),
  'tio2-b': Object.freeze(tio2B),
})

for (const site of Object.values(siteConfigs)) {
  assertSiteRfqHref(site)
}

export function getSiteConfig(id: string): SiteConfig {
  if (!Object.hasOwn(siteConfigs, id)) {
    throw new Error(`Unknown SITE_ID: ${id}`)
  }

  return siteConfigs[id as SiteId]
}
