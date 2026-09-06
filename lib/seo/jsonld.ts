import type {SiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import {htmlToPlainText, normalizePlainText} from './text'

export type JsonLdObject = Readonly<Record<string, unknown>>

function firstText(...values: readonly string[]): string {
  for (const value of values) {
    if (value) return value
  }

  return ''
}

function titleCaseSegment(segment: string): string {
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ')
}

function buildBreadcrumbs(
  site: SiteConfig,
  page: ContentPageDto,
  canonical: string,
): JsonLdObject {
  const segments = page.path.split('/').filter(Boolean)
  const itemListElement: Array<Record<string, unknown>> = [
    {
      '@type': 'ListItem',
      position: 1,
      name:
        page.path === '/'
          ? firstText(normalizePlainText(page.title), 'Home')
          : 'Home',
      item: new URL('/', site.url).href,
    },
  ]

  segments.forEach((segment, index) => {
    const isCurrentPage = index === segments.length - 1
    itemListElement.push({
      '@type': 'ListItem',
      position: index + 2,
      name: isCurrentPage
        ? firstText(normalizePlainText(page.title), titleCaseSegment(segment))
        : titleCaseSegment(segment),
      item: new URL(`/${segments.slice(0, index + 1).join('/')}`, site.url).href,
    })
  })

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement,
  }
}

export function buildPageJsonLd(
  site: SiteConfig,
  page: ContentPageDto,
): JsonLdObject[] {
  const canonical = new URL(page.path, site.url).href
  const organizationId = new URL('/#organization', site.url).href
  const websiteId = new URL('/#website', site.url).href
  const name = firstText(
    normalizePlainText(page.title),
    normalizePlainText(page.seo.title),
    htmlToPlainText(site.name),
  )
  const description = firstText(
    normalizePlainText(page.seo.description),
    normalizePlainText(page.excerpt),
    htmlToPlainText(site.defaultSeo.description),
  )
  const pageObject: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${canonical}#webpage`,
    name,
    description,
    url: canonical,
    isPartOf: {'@id': websiteId},
    breadcrumb: {'@id': `${canonical}#breadcrumb`},
  }

  if (isStrictUtcInstant(page.modified)) {
    pageObject.dateModified = page.modified
  }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: htmlToPlainText(site.name),
      url: new URL('/', site.url).href,
      email: site.contactEmail,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: htmlToPlainText(site.name),
      url: new URL('/', site.url).href,
      publisher: {'@id': organizationId},
    },
    buildBreadcrumbs(site, page, canonical),
    pageObject,
  ]
}

export function serializeJsonLd(value: JsonLdObject | readonly JsonLdObject[]): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
