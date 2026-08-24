import {tio2A} from './tio2-a'
import {tio2B} from './tio2-b'
import type {SiteConfig, SiteId} from './types'

export type {
  HomepageTemplateKey,
  PublicRouteDefinition,
  ShellTemplateKey,
  SiteConfig,
  SiteId,
  SiteTemplateProfile,
  TemplateState,
} from './types'
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

export function getSiteConfig(id: string): SiteConfig {
  if (!Object.hasOwn(siteConfigs, id)) {
    throw new Error(`Unknown SITE_ID: ${id}`)
  }

  return siteConfigs[id as SiteId]
}
