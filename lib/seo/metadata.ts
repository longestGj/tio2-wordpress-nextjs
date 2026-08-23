import type {Metadata} from 'next'

import type {SiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'
import {htmlToPlainText, normalizePlainText} from './text'

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

function firstText(...values: readonly string[]): string {
  for (const value of values) {
    if (value) return value
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
    page.status === 'publish' &&
    !options.draftMode &&
    isPublicIndexingEnabled(options.env)

  return {
    title: firstText(
      normalizePlainText(page.seo.title),
      normalizePlainText(page.title),
      htmlToPlainText(site.defaultSeo.title),
      htmlToPlainText(site.name),
    ),
    description: firstText(
      normalizePlainText(page.seo.description),
      normalizePlainText(page.excerpt),
      htmlToPlainText(site.defaultSeo.description),
      htmlToPlainText(site.description),
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
