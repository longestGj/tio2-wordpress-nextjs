import {isPublicRoute} from '@/sites/public-routes'
import type {SiteId} from '@/sites/types'

export interface HomepageLinkPolicy {
  readonly siteId: SiteId
  isPublic(path: string): boolean
}

export function getHomepageLinkPolicy(siteId: SiteId): HomepageLinkPolicy {
  return Object.freeze({
    siteId,
    isPublic: (path: string) => isPublicRoute(siteId, path),
  })
}
