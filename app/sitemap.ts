import type {MetadataRoute} from 'next'

import {getCurrentSite} from '@/lib/sites/current-site'
import {isValidPublicPath} from '@/lib/wordpress/cache-tags'
import {HomepageContractError} from '@/lib/wordpress/homepage-dto'
import {getHomepage} from '@/lib/wordpress/homepage-queries'
import {getSitemapContentPage} from '@/lib/wordpress/queries'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import type {SiteConfig} from '@/sites'

export type SitemapPaginationErrorReason = 'missing' | 'repeated'

export class SitemapPaginationError extends Error {
  readonly reason: SitemapPaginationErrorReason

  constructor(reason: SitemapPaginationErrorReason) {
    super(
      reason === 'missing'
        ? 'Sitemap page reports a continuation without an end cursor'
        : 'Sitemap pagination repeated a cursor',
    )
    this.name = 'SitemapPaginationError'
    this.reason = reason
  }
}

export type SitemapIntegrityErrorReason =
  | 'path-conflict'
  | 'id-conflict'
  | 'source-invalid'

interface SitemapIntegrityErrorDetails {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string
  readonly conflictingId?: string
  readonly conflictingPath?: string
}

export class SitemapIntegrityError extends Error {
  readonly reason: SitemapIntegrityErrorReason
  readonly firstId: string
  readonly path: string
  readonly conflictingId?: string
  readonly conflictingPath?: string

  constructor(details: SitemapIntegrityErrorDetails) {
    super(
      details.reason === 'path-conflict'
        ? `Sitemap path ${details.path} belongs to multiple page IDs`
        : details.reason === 'id-conflict'
          ? `Sitemap page ${details.firstId} has conflicting paths`
          : `Sitemap source for ${details.path} is invalid`,
    )
    this.name = 'SitemapIntegrityError'
    this.reason = details.reason
    this.firstId = details.firstId
    this.path = details.path
    this.conflictingId = details.conflictingId
    this.conflictingPath = details.conflictingPath
  }
}

export interface SitemapSources {
  readonly getHomepage: typeof getHomepage
  readonly getSitemapContentPage: typeof getSitemapContentPage
}

const defaultSitemapSources: SitemapSources = {
  getHomepage,
  getSitemapContentPage,
}

export async function buildSitemap(
  site: SiteConfig,
  sources: SitemapSources = defaultSitemapSources,
): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = []
  const pathIds = new Map<string, string>()
  const idPaths = new Map<string, string>()
  const cursors = new Set<string>()
  let after: string | undefined

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
    homepage.identity.path !== '/' ||
    homepage.identity.status !== 'publish'
  ) {
    throw new SitemapIntegrityError({
      reason: 'source-invalid',
      firstId: homepage?.identity.id ?? 'homepage',
      path: '/',
    })
  }

  pathIds.set('/', homepage.identity.id)
  idPaths.set(homepage.identity.id, '/')
  const homepageEntry: MetadataRoute.Sitemap[number] = {
    url: new URL('/', site.url).href,
  }
  if (isStrictUtcInstant(homepage.identity.modified)) {
    homepageEntry.lastModified = new Date(homepage.identity.modified)
  }
  entries.push(homepageEntry)

  for (;;) {
    const connection = await sources.getSitemapContentPage(site.id, after)

    for (const page of connection.nodes) {
      if (
        page.siteId !== site.id ||
        page.status !== 'publish' ||
        !isValidPublicPath(page.path)
      ) {
        continue
      }

      const previousPath = idPaths.get(page.id)
      if (previousPath !== undefined && previousPath !== page.path) {
        throw new SitemapIntegrityError({
          reason: 'id-conflict',
          firstId: page.id,
          path: previousPath,
          conflictingPath: page.path,
        })
      }

      const previousId = pathIds.get(page.path)
      if (
        previousId !== undefined &&
        (previousId !== page.id || page.path === '/')
      ) {
        throw new SitemapIntegrityError({
          reason: 'path-conflict',
          firstId: previousId,
          conflictingId: page.id,
          path: page.path,
        })
      }

      if (previousPath === page.path && previousId === page.id) continue

      idPaths.set(page.id, page.path)
      pathIds.set(page.path, page.id)
      const entry: MetadataRoute.Sitemap[number] = {
        url: new URL(page.path, site.url).href,
      }

      if (isStrictUtcInstant(page.modified)) {
        entry.lastModified = new Date(page.modified)
      }

      entries.push(entry)
    }

    if (!connection.hasNextPage) return entries

    const nextCursor = connection.endCursor
    if (!nextCursor) throw new SitemapPaginationError('missing')
    if (cursors.has(nextCursor)) throw new SitemapPaginationError('repeated')

    cursors.add(nextCursor)
    after = nextCursor
  }
}

export default function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemap(getCurrentSite())
}
