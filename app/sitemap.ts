import type {MetadataRoute} from 'next'

import {ProductPageContractError} from '@/lib/products/page-dto'
import {
  getMalaysiaEuMarketRelatedRouteStates,
  projectMalaysiaEuMarketDynamicState,
} from '@/lib/markets/malaysia-eu-market-projection'
import {resolveProductPageIdentity, type ProductPageIdentity} from '@/lib/products/page-graph'
import {getCurrentSite} from '@/lib/sites/current-site'
import {HomepageContractError} from '@/lib/wordpress/homepage-dto'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {EuMarketPageContractError} from '@/lib/wordpress/market-page-v01-dto'
import {getMalaysiaEuMarketPage} from '@/lib/wordpress/market-page-v01-queries'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import type {SiteConfig} from '@/sites'
import {
  getApprovedProductPagePaths,
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
  readonly getSiteProductPage: typeof getSiteProductPage
  readonly getMalaysiaEuMarketPage?: typeof getMalaysiaEuMarketPage
  readonly getPublicRoutes: typeof getPublicRoutes
  readonly getSiteTemplateProfile: typeof getSiteTemplateProfile
}

const defaultSitemapSources: SitemapSources = {
  getHomepage,
  getSiteProductPage,
  getMalaysiaEuMarketPage,
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
      readonly identity: ProductPageIdentity
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
  const approvedProductPaths = new Set(getApprovedProductPagePaths(site.id, routes))
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

    const identity = resolveProductPageIdentity(route.path)
    if (!approvedProductPaths.has(route.path) || !identity) inventoryError(route.path)

    return {
      kind: 'product',
      route: route as ProductRouteDefinition,
      identity,
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
  identity: ProductPageIdentity,
  sources: SitemapSources,
): Promise<MetadataRoute.Sitemap[number]> {
  let product
  try {
    product = await sources.getSiteProductPage(site, identity.path)
  } catch (error) {
    if (
      error instanceof ProductPageContractError ||
      error instanceof CrossSiteContentError
    ) {
      throw new SitemapIntegrityError({
        reason: 'source-invalid',
        firstId: identity.id,
        path: route.path,
      })
    }
    throw error
  }

  if (
    !product ||
    product.identity.path !== route.path ||
    product.level !== identity.level
  ) {
    throw new SitemapIntegrityError({
      reason: 'source-invalid',
      firstId: product?.identity.id ?? identity.id,
      path: route.path,
    })
  }

  return {url: new URL(route.path, site.url).href}
}

async function malaysiaEuMarketEntry(
  site: SiteConfig,
  source: typeof getMalaysiaEuMarketPage,
): Promise<MetadataRoute.Sitemap[number] | null> {
  let marketPage
  try {
    marketPage = await source()
  } catch (error) {
    if (error instanceof EuMarketPageContractError || error instanceof CrossSiteContentError) {
      throw new SitemapIntegrityError({
        reason: 'source-invalid', firstId: 'MARKET-EU-001',
        path: '/markets/european-union/',
      })
    }
    throw error
  }
  if (site.id !== 'tio2-my' || marketPage.identity.siteId !== 'tio2-my' ||
    marketPage.identity.path !== '/markets/european-union/' ||
    marketPage.identity.locale !== 'en') {
    throw new SitemapIntegrityError({
      reason: 'source-invalid', firstId: marketPage.identity.pageId,
      path: '/markets/european-union/',
    })
  }
  const state = projectMalaysiaEuMarketDynamicState({
    evidence: marketPage.trade.evidence ?? {},
    importEvidence: marketPage.importRoles.source ?? {},
    routeState: marketPage.relations.tradeUpdate.routeState,
    datedContext: marketPage.trade.datedContext,
    action: marketPage.relations.tradeUpdate,
    originHold: marketPage.releaseControls.originHold,
    releaseEnabled: marketPage.releaseControls.releaseEnabled,
    indexingAuthorized: marketPage.releaseControls.indexingAuthorized,
    relatedRoutesReady: marketPage.releaseControls.relatedRoutesReady,
    conversionRuntimeReady: marketPage.releaseControls.conversionRuntimeReady,
    runtimeAcceptanceReady: marketPage.releaseControls.runtimeAcceptanceReady,
    tradeFreshness: marketPage.releaseControls.tradeFreshness,
    relatedRouteStates: getMalaysiaEuMarketRelatedRouteStates(marketPage),
  })
  if (!state.canIndex || !marketPage.releaseControls.sitemapAuthorized) return null
  return sitemapEntry(site, marketPage.identity.path, marketPage.identity.modified)
}

export async function buildSitemap(
  site: SiteConfig,
  sources: SitemapSources = defaultSitemapSources,
): Promise<MetadataRoute.Sitemap> {
  const routes = sources.getPublicRoutes(site.id)
  const profile = sources.getSiteTemplateProfile(site.id)
  const validatedRoutes = validateRoutes(site, routes, profile)

  const entries = await Promise.all(
    validatedRoutes.map((item) =>
      item.kind === 'homepage'
        ? homepageEntry(site, item.route, profile, sources)
        : productEntry(site, item.route, item.identity, sources),
    ),
  )
  if (site.id === 'tio2-my' && sources.getMalaysiaEuMarketPage) {
    const marketEntry = await malaysiaEuMarketEntry(site, sources.getMalaysiaEuMarketPage)
    if (marketEntry) entries.push(marketEntry)
  }
  return entries
}

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(getCurrentSite())
}
