import type {MetadataRoute} from 'next'

import {ProductContractError} from '@/lib/products/dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {HomepageContractError} from '@/lib/wordpress/homepage-dto'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {getSiteProduct} from '@/lib/wordpress/product-queries'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import type {SiteConfig} from '@/sites'
import {
  getApprovedProductSlugs,
  getPublicRoutes,
} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'
import {PRODUCT_TEMPLATE_KEY} from '@/sites/types'
import type {
  HomepageRouteDefinition,
  ProductRouteDefinition,
  PublicRouteDefinition,
  SiteTemplateProfile,
} from '@/sites/types'

export type SitemapIntegrityErrorReason =
  | 'inventory-invalid'
  | 'source-invalid'

interface SitemapIntegrityErrorDetails {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string
}

export class SitemapIntegrityError extends Error {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string

  constructor(details: SitemapIntegrityErrorDetails) {
    super(
      details.reason === 'inventory-invalid'
        ? `Sitemap inventory is invalid for ${details.path}`
        : `Sitemap source for ${details.path} is invalid`,
    )
    this.name = 'SitemapIntegrityError'
    this.reason = details.reason
    this.firstId = details.firstId
    this.path = details.path
  }
}

export interface SitemapSources {
  readonly getHomepage: typeof getHomepage
  readonly getSiteProduct: typeof getSiteProduct
  readonly getPublicRoutes: typeof getPublicRoutes
  readonly getSiteTemplateProfile: typeof getSiteTemplateProfile
}

const defaultSitemapSources: SitemapSources = {
  getHomepage,
  getSiteProduct,
  getPublicRoutes,
  getSiteTemplateProfile,
}

type ValidatedSitemapRoute =
  | {
      readonly kind: 'homepage'
      readonly route: HomepageRouteDefinition
    }
  | {
      readonly kind: 'product'
      readonly route: ProductRouteDefinition
      readonly slug: string
    }

function inventoryError(path: string): never {
  throw new SitemapIntegrityError({
    reason: 'inventory-invalid',
    firstId: 'inventory',
    path,
  })
}

function validateRoutes(
  site: SiteConfig,
  routes: readonly PublicRouteDefinition[],
  profile: SiteTemplateProfile,
): readonly ValidatedSitemapRoute[] {
  const approvedProductPaths = new Map(
    getApprovedProductSlugs(site.id, routes).map((slug) => [
      `/products/${slug}`,
      slug,
    ]),
  )
  const paths = new Set<string>()
  let homepageCount = 0

  const validated = routes.map((route): ValidatedSitemapRoute => {
    if (paths.has(route.path)) inventoryError(route.path)
    paths.add(route.path)

    if (route.path === '/') {
      homepageCount += 1
      if (route.template !== profile.homepage.key) inventoryError(route.path)
      return {kind: 'homepage', route: route as HomepageRouteDefinition}
    }

    if (
      site.id !== 'tio2-a' ||
      site.wordpressScope !== 'tio2-a' ||
      route.template !== PRODUCT_TEMPLATE_KEY
    ) {
      inventoryError(route.path)
    }

    const slug = approvedProductPaths.get(route.path)
    if (!slug) inventoryError(route.path)

    return {
      kind: 'product',
      route: route as ProductRouteDefinition,
      slug,
    }
  })

  if (homepageCount !== 1) inventoryError('/')
  return validated
}

function sitemapEntry(
  site: SiteConfig,
  path: string,
  modified: string,
): MetadataRoute.Sitemap[number] {
  const entry: MetadataRoute.Sitemap[number] = {
    url: new URL(path, site.url).href,
  }
  if (isStrictUtcInstant(modified)) {
    entry.lastModified = new Date(modified)
  }
  return entry
}

async function homepageEntry(
  site: SiteConfig,
  route: HomepageRouteDefinition,
  profile: SiteTemplateProfile,
  sources: SitemapSources,
): Promise<MetadataRoute.Sitemap[number]> {
  let homepage
  try {
    homepage = await sources.getHomepage(site.id)
  } catch (error) {
    if (
      error instanceof HomepageContractError ||
      error instanceof CrossSiteContentError
    ) {
      throw new SitemapIntegrityError({
        reason: 'source-invalid',
        firstId: 'homepage',
        path: route.path,
      })
    }
    throw error
  }

  if (
    !homepage ||
    homepage.identity.siteId !== site.id ||
    homepage.identity.path !== route.path ||
    homepage.identity.status !== 'publish' ||
    homepage.identity.schemaVersion !== profile.homepage.schemaVersion
  ) {
    throw new SitemapIntegrityError({
      reason: 'source-invalid',
      firstId: homepage?.identity.id ?? 'homepage',
      path: route.path,
    })
  }

  return sitemapEntry(site, route.path, homepage.identity.modified)
}

async function productEntry(
  site: SiteConfig,
  route: ProductRouteDefinition,
  slug: string,
  sources: SitemapSources,
): Promise<MetadataRoute.Sitemap[number]> {
  let product
  try {
    product = await sources.getSiteProduct(site, slug)
  } catch (error) {
    if (
      error instanceof ProductContractError ||
      error instanceof CrossSiteContentError
    ) {
      throw new SitemapIntegrityError({
        reason: 'source-invalid',
        firstId: slug,
        path: route.path,
      })
    }
    throw error
  }

  if (
    !product ||
    product.identity.slug !== slug ||
    product.identity.path !== route.path
  ) {
    throw new SitemapIntegrityError({
      reason: 'source-invalid',
      firstId: product?.identity.productId ?? slug,
      path: route.path,
    })
  }

  return sitemapEntry(site, route.path, product.identity.modified)
}

export async function buildSitemap(
  site: SiteConfig,
  sources: SitemapSources = defaultSitemapSources,
): Promise<MetadataRoute.Sitemap> {
  const routes = sources.getPublicRoutes(site.id)
  const profile = sources.getSiteTemplateProfile(site.id)
  const validatedRoutes = validateRoutes(site, routes, profile)

  return Promise.all(
    validatedRoutes.map((item) =>
      item.kind === 'homepage'
        ? homepageEntry(site, item.route, profile, sources)
        : productEntry(site, item.route, item.slug, sources),
    ),
  )
}

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(getCurrentSite())
}
