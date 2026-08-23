import type {SiteId} from '@/sites'

const SITE_IDS = new Set<SiteId>(['tio2-a', 'tio2-b'])

function assertSiteId(siteId: string): asserts siteId is SiteId {
  if (!SITE_IDS.has(siteId as SiteId)) {
    throw new Error(`Invalid site ID: ${siteId}`)
  }
}

function assertPositiveId(id: number, label: 'content' | 'entity'): void {
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error(`Invalid ${label} ID: ${id}`)
  }
}

export function isValidPublicPath(path: string): boolean {
  if (
    path.length === 0 ||
    path.length > 200 ||
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('%') ||
    /[\u0000-\u001f\u007f]/u.test(path)
  ) {
    return false
  }

  const segments = path.split('/')
  return !segments.some(
    (segment, index) =>
      (index > 0 && segment.length === 0 && index < segments.length - 1) ||
      segment === '.' ||
      segment === '..',
  )
}

function assertPublicPath(path: string): void {
  if (!isValidPublicPath(path)) {
    throw new Error(`Invalid public path: ${path}`)
  }
}

export function siteTag(siteId: string): string {
  assertSiteId(siteId)
  return `site:${siteId}`
}

export function contentTag(siteId: string, contentId: number): string {
  assertSiteId(siteId)
  assertPositiveId(contentId, 'content')
  return `content:${siteId}:${contentId}`
}

export function routeTag(siteId: string, path: string): string {
  assertSiteId(siteId)
  assertPublicPath(path)
  return `route:${siteId}:${path}`
}

export function entityTag(siteId: string, entityId: number): string {
  assertSiteId(siteId)
  assertPositiveId(entityId, 'entity')
  return `entity:${siteId}:${entityId}`
}
