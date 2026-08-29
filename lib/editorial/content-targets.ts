import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'

import type {EditorialTarget} from './types'

export interface CanonicalEditorialTarget {
  readonly target: EditorialTarget
  readonly path: string
}

const applicationPaths = new Map<string, string>(
  SITE_A_APPLICATION_IDENTITIES.map(([id, , path]) => [id, path]),
)
const resourcePaths = new Map<string, string>(
  SITE_A_RESOURCE_IDENTITIES.map(([id, , path]) => [id, path]),
)
const productIds = new Set<string>(SITE_A_PRODUCT_IDS)
const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.filter(({level}) => level === 'detail')
    .map(({id, path}) => [id, path]),
)

export function resolveCanonicalEditorialTarget(
  targetType: string,
  targetId: string,
): CanonicalEditorialTarget | null {
  if (targetType === 'application') {
    const path = applicationPaths.get(targetId)
    return path
      ? {target: {type: 'application', id: targetId}, path}
      : null
  }
  if (targetType === 'resource') {
    const path = resourcePaths.get(targetId)
    return path ? {target: {type: 'resource', id: targetId}, path} : null
  }
  if (targetType === 'product' && productIds.has(targetId)) {
    const path = productPaths.get(targetId)
    if (!path) return null
    return {
      target: {type: 'product', id: targetId},
      path,
    }
  }
  return null
}
