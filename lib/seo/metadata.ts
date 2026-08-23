import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'

export const LOCAL_INDEXING_OVERRIDE = 'SEO_ALLOW_INDEXING_LOCAL_TEST'

export interface SeoEnvironment {
  readonly [key: string]: string | undefined
  readonly VERCEL_ENV?: string
  readonly SEO_ALLOW_INDEXING_LOCAL_TEST?: string
}

interface PageMetadataOptions {
  readonly draftMode?: boolean
  readonly env?: SeoEnvironment
}

function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim()
}

function firstText(...values: readonly string[]): string {
  for (const value of values) {
    const cleaned = cleanText(value)
    if (cleaned) return cleaned
  }

  return ''
}

export function isPublicIndexingEnabled(
  env: SeoEnvironment = process.env,
): boolean {
  return (
    env.VERCEL_ENV === 'production' ||
    env.SEO_ALLOW_INDEXING_LOCAL_TEST === 'true'
  )
}

export function buildPageMetadata(
  site: SiteConfig,
  page: ContentPageDto,
  options: PageMetadataOptions = {},
): Metadata {
  const publicIndexing =
    !options.draftMode && isPublicIndexingEnabled(options.env)

  return {
    title: firstText(page.seo.title, page.title, site.defaultSeo.title, site.name),
    description: firstText(
      page.seo.description,
      page.excerpt,
      site.defaultSeo.description,
      site.description,
    ),
    alternates: {
      canonical: new URL(page.path, site.url).href,
    },
    robots: {
      index: publicIndexing,
      follow: publicIndexing,
    },
  }
}
