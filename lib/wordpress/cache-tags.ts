import {SITE_IDS} from '@/sites'
import type {SiteId} from '@/sites'
import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {
  SITE_A_PRODUCT_FAMILIES,
  resolveProductPageIdentity,
} from '@/lib/products/page-graph'
import {isApprovedMalaysiaProductDetailSlug} from './product-detail-v01-registry'

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
const productFamilySlugs = new Set<string>(
  SITE_A_PRODUCT_FAMILIES.map(({slug}) => slug),
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

export function productsHubTag(siteId: string): string {
  assertSiteId(siteId)
  return `products-hub:${siteId}`
}

export function productFamilyTag(siteId: string, familySlug: string): string {
  assertSiteId(siteId)
  if (!productFamilySlugs.has(familySlug)) {
    throw new Error(`Invalid Product Family slug: ${familySlug}`)
  }
  return `product-family:${siteId}:${familySlug}`
}

export function productDetailTag(
  siteId: string,
  familySlug: string,
  productSlug: string,
): string {
  assertSiteId(siteId)
  const identity = resolveProductPageIdentity(
    `/products/${familySlug}/${productSlug}`,
  )
  if (
    !identity ||
    identity.level !== 'detail' ||
    identity.familySlug !== familySlug ||
    identity.productSlug !== productSlug
  ) {
    throw new Error(
      `Invalid Product Detail identity: ${familySlug}/${productSlug}`,
    )
  }
  return `product-detail:${siteId}:${familySlug}:${productSlug}`
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

export function marketHubContentTag(siteId: string): string {
  assertSiteId(siteId)
  return `content:${siteId}--markets`
}

export function marketPageContentTag(siteId: string, pageId: string, locale: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my' || !['MARKET-EU-001', 'MARKET-UK-001'].includes(pageId) || locale !== 'en') {
    throw new Error(`Invalid Malaysia Market page identity: ${siteId}/${pageId}/${locale}`)
  }
  return `content:${siteId}--market--${pageId}--${locale}`
}

export function productHubContentTag(siteId: string): string {
  assertSiteId(siteId)
  return `content:${siteId}--products`
}

export function resourceHubContentTag(siteId: string): string {
  assertSiteId(siteId)
  return `content:${siteId}--resources`
}

export function aboutPageContentTag(siteId: string): string {
  assertSiteId(siteId)
  return `content:${siteId}--about`
}

export function documentsHubContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid Documents Hub scope: ${siteId}`)
  return `content:${siteId}--documents`
}

export function documentTdsContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid DOC-TDS scope: ${siteId}`)
  return `content:${siteId}--document-tds`
}

export function documentReachContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid DOC-REACH scope: ${siteId}`)
  return `content:${siteId}--document-reach`
}

export function legalPagesContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid Legal pages scope: ${siteId}`)
  return `content:${siteId}--legal-pages`
}

export function rfqPageContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid RFQ page scope: ${siteId}`)
  return `content:${siteId}--request-a-quote`
}

export function requestDocumentsContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid Request Documents scope: ${siteId}`)
  return `content:${siteId}--request-documents`
}

export function requestSampleContentTag(siteId: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my') throw new Error(`Invalid Request Sample scope: ${siteId}`)
  return `content:${siteId}--request-sample`
}

export function aboutPageVersionTag(siteId: string, contentVersion: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my' || !/^ABOUT-001-G7-PCR-02:FACTS-V0\.1$/u.test(contentVersion)) {
    throw new Error(`Invalid Malaysia About content version: ${siteId}/${contentVersion}`)
  }
  return `content-version:${siteId}:${contentVersion}`
}

export function productDetailContentTag(siteId: string, slug: string): string {
  assertSiteId(siteId)
  if (siteId !== 'tio2-my' || !isApprovedMalaysiaProductDetailSlug(slug)) {
    throw new Error(`Invalid Malaysia Product Detail identity: ${siteId}/${slug}`)
  }
  return `content:${siteId}--product-detail--${slug}`
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
