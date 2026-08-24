import type {SiteId} from '@/sites'

const SITE_IDS = new Set<SiteId>(['tio2-a', 'tio2-b'])
const MAX_CANONICAL_PUBLIC_PATH_LENGTH = 172
const CANONICAL_PUBLIC_PATH_PATTERN =
  /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/u

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
  if (path.length === 0 || path.startsWith('//')) {
    return false
  }

  const normalized =
    path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path
  return (
    normalized.length <= MAX_CANONICAL_PUBLIC_PATH_LENGTH &&
    CANONICAL_PUBLIC_PATH_PATTERN.test(normalized)
  )
}

function assertPublicPath(path: string): void {
  if (!isValidPublicPath(path)) {
    throw new Error(`Invalid public path: ${path}`)
  }
}

export function normalizePublicPath(path: string): string {
  assertPublicPath(path)
  return path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path
}

export function siteTag(siteId: string): string {
  assertSiteId(siteId)
  return `site:${siteId}`
}

export function contentListTag(siteId: string): string {
  assertSiteId(siteId)
  return `content-list:${siteId}`
}

export function sitemapTag(siteId: string): string {
  assertSiteId(siteId)
  return `sitemap:${siteId}`
}

export function contentTag(siteId: string, contentId: number): string {
  assertSiteId(siteId)
  assertPositiveId(contentId, 'content')
  return `content:${siteId}:${contentId}`
}

export function homepageContentTag(siteId: string): string {
  assertSiteId(siteId)
  return `content:${siteId}--homepage`
}

export function routeTag(siteId: string, path: string): string {
  assertSiteId(siteId)
  return `route:${siteId}:${normalizePublicPath(path)}`
}

export function entityTag(siteId: string, entityId: number): string {
  assertSiteId(siteId)
  assertPositiveId(entityId, 'entity')
  return `entity:${siteId}:${entityId}`
}
