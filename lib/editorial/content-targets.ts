import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'
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
    return {
      target: {type: 'product', id: targetId},
      path: `/products/${targetId.toLowerCase()}`,
    }
  }
  return null
}
