import type {Metadata} from 'next'

import type {AnyHomepageDto} from '@/lib/wordpress/homepage-types'
import type {SiteConfig} from '@/sites'
import {isPublicIndexingEnabled} from './metadata'
import {htmlToPlainText, normalizePlainText} from './text'

interface HomepageMetadataOptions {
  readonly draftMode?: boolean
  readonly env?: Readonly<Record<string, string | undefined>>
}

function firstText(...values: readonly string[]): string {
  return values.find(Boolean) ?? ''
}

function isCurrentSiteHttpsImage(site: SiteConfig, src: string): boolean {
  try {
    const siteUrl = new URL(site.url)
    const imageUrl = new URL(src)
    return imageUrl.protocol === 'https:' && imageUrl.origin === siteUrl.origin
  } catch {
    return false
  }
}

export function buildHomepageMetadata(
  site: SiteConfig,
  homepage: AnyHomepageDto,
  options: HomepageMetadataOptions = {},
): Metadata {
  const canonical = new URL('/', site.url).href
  const title = firstText(
    normalizePlainText(homepage.seo.title, 60),
    htmlToPlainText(site.defaultSeo.title, 60),
    htmlToPlainText(site.name, 60),
  )
  const description = firstText(
    normalizePlainText(homepage.seo.description, 160),
    htmlToPlainText(site.defaultSeo.description, 160),
    htmlToPlainText(site.description, 160),
  )
  const publicIndexing =
    homepage.identity.status === 'publish' &&
    !options.draftMode &&
    isPublicIndexingEnabled(options.env)
  const openGraph: NonNullable<Metadata['openGraph']> = {
    type: 'website',
    url: canonical,
    siteName: htmlToPlainText(site.name, 60),
    title,
    description,
  }

  if (
    homepage.seo.ogImage &&
    isCurrentSiteHttpsImage(site, homepage.seo.ogImage.src)
  ) {
    openGraph.images = [
      {
        url: homepage.seo.ogImage.src,
        alt: homepage.seo.ogImage.alt,
        width: homepage.seo.ogImage.width,
        height: homepage.seo.ogImage.height,
        type: homepage.seo.ogImage.mimeType,
      },
    ]
  }

  return {
    title,
    description,
    alternates: {canonical},
    robots: {index: publicIndexing, follow: publicIndexing},
    openGraph,
  }
}
