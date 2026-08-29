import {resolveProductPageIdentity} from './page-graph'

const PRODUCT_SEGMENT = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export function productPathFromSegments(
  segments: readonly string[],
): string | null {
  if (segments.length > 2) return null
  if (!segments.every((segment) => PRODUCT_SEGMENT.test(segment))) return null

  const path = segments.length === 0
    ? '/products'
    : `/products/${segments.join('/')}`

  return resolveProductPageIdentity(path) ? path : null
}

export function productSegmentsFromPath(path: string): readonly string[] | null {
  const identity = resolveProductPageIdentity(path)
  if (!identity) return null

  if (identity.level === 'hub') return []
  if (identity.level === 'family') return [identity.familySlug!]
  return [identity.familySlug!, identity.productSlug!]
}
