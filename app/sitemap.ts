import type {MetadataRoute} from 'next'

import {getCurrentSite} from '@/lib/sites/current-site'
import {HomepageContractError} from '@/lib/wordpress/homepage-dto'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import type {SiteConfig} from '@/sites'
import {getPublicRoutes} from '@/sites/public-routes'
import {getSiteTemplateProfile} from '@/sites/template-profiles'

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
  readonly getPublicRoutes: typeof getPublicRoutes
  readonly getSiteTemplateProfile: typeof getSiteTemplateProfile
}

const defaultSitemapSources: SitemapSources = {
  getHomepage,
  getPublicRoutes,
  getSiteTemplateProfile,
}

export async function buildSitemap(
  site: SiteConfig,
  sources: SitemapSources = defaultSitemapSources,
): Promise<MetadataRoute.Sitemap> {
  const routes = sources.getPublicRoutes(site.id)
  const profile = sources.getSiteTemplateProfile(site.id)
  const [homepageRoute] = routes

  if (
    routes.length !== 1 ||
    !homepageRoute ||
    homepageRoute.path !== '/' ||
    homepageRoute.template !== profile.homepage.key
  ) {
    throw new SitemapIntegrityError({
      reason: 'inventory-invalid',
      firstId: 'inventory',
      path: '/',
    })
  }

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
        path: '/',
      })
    }
    throw error
  }

  if (
    !homepage ||
    homepage.identity.siteId !== site.id ||
    homepage.identity.path !== homepageRoute.path ||
    homepage.identity.status !== 'publish' ||
    homepage.identity.schemaVersion !== profile.homepage.schemaVersion
  ) {
    throw new SitemapIntegrityError({
      reason: 'source-invalid',
      firstId: homepage?.identity.id ?? 'homepage',
      path: '/',
    })
  }

  const entry: MetadataRoute.Sitemap[number] = {
    url: new URL(homepageRoute.path, site.url).href,
  }
  if (isStrictUtcInstant(homepage.identity.modified)) {
    entry.lastModified = new Date(homepage.identity.modified)
  }

  return [entry]
}

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(getCurrentSite())
}
