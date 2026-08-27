import {SITE_IDS} from '@/sites'
import type {SiteId} from '@/sites'
import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'

const siteIdSet = new Set<SiteId>(SITE_IDS)
const MAX_CANONICAL_PUBLIC_PATH_LENGTH = 172
const CANONICAL_PUBLIC_PATH_PATTERN =
  /^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/u
const PRODUCT_SLUG_PATTERN = /^tp-[a-z]{1,2}[0-9]{3}$/u
const applicationIds = new Set<string>(
  SITE_A_APPLICATION_IDENTITIES.map(([id]) => id),
)
const resourceIds = new Set<string>(
  SITE_A_RESOURCE_IDENTITIES.map(([id]) => id),
)

function assertSiteId(siteId: string): asserts siteId is SiteId {
  if (!siteIdSet.has(siteId as SiteId)) {
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

export function productListTag(siteId: string): string {
  assertSiteId(siteId)
  return `product-list:${siteId}`
}

export function productTag(siteId: string, slug: string): string {
  assertSiteId(siteId)
  if (!PRODUCT_SLUG_PATTERN.test(slug)) {
    throw new Error(`Invalid product slug: ${slug}`)
  }
  return `product:${siteId}:${slug}`
}

export function applicationListTag(siteId: string): string {
  assertSiteId(siteId)
  return `application-list:${siteId}`
}

export function applicationTag(siteId: string, id: string): string {
  assertSiteId(siteId)
  if (!applicationIds.has(id)) {
    throw new Error(`Invalid Application ID: ${id}`)
  }
  return `application:${siteId}:${id}`
}

export function resourceListTag(siteId: string): string {
  assertSiteId(siteId)
  return `resource-list:${siteId}`
}

export function resourceTag(siteId: string, id: string): string {
  assertSiteId(siteId)
  if (!resourceIds.has(id)) {
    throw new Error(`Invalid Resource ID: ${id}`)
  }
  return `resource:${siteId}:${id}`
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
