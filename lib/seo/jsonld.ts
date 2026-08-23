import type {SiteConfig} from '@/sites'
import type {ContentPageDto} from '@/lib/wordpress/types'

export type JsonLdObject = Readonly<Record<string, unknown>>

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
      name: page.path === '/' ? firstText(page.title, 'Home') : 'Home',
      item: new URL('/', site.url).href,
    },
  ]

  segments.forEach((segment, index) => {
    const isCurrentPage = index === segments.length - 1
    itemListElement.push({
      '@type': 'ListItem',
      position: index + 2,
      name: isCurrentPage
        ? firstText(page.title, titleCaseSegment(segment))
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

function isProductDetailPath(path: string): boolean {
  return /^\/products\/[^/]+$/u.test(path)
}

export function buildPageJsonLd(
  site: SiteConfig,
  page: ContentPageDto,
): JsonLdObject[] {
  const canonical = new URL(page.path, site.url).href
  const organizationId = new URL('/#organization', site.url).href
  const websiteId = new URL('/#website', site.url).href
  const title = firstText(page.seo.title, page.title, site.defaultSeo.title)
  const name = firstText(page.title, page.seo.title, site.name)
  const description = firstText(
    page.seo.description,
    page.excerpt,
    site.defaultSeo.description,
  )
  const productDetail = isProductDetailPath(page.path)
  const pageObject: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': productDetail ? 'Product' : 'Article',
    '@id': `${canonical}#${productDetail ? 'product' : 'article'}`,
    name,
    description,
    url: canonical,
  }

  if (productDetail) {
    pageObject.brand = {'@id': organizationId}
  } else {
    pageObject.headline = title
    pageObject.mainEntityOfPage = canonical
    pageObject.publisher = {'@id': organizationId}
    if (Number.isFinite(Date.parse(page.modified))) {
      pageObject.dateModified = new Date(page.modified).toISOString()
    }
  }

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': organizationId,
      name: site.name,
      url: new URL('/', site.url).href,
      email: site.contactEmail,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': websiteId,
      name: site.name,
      url: new URL('/', site.url).href,
      publisher: {'@id': organizationId},
    },
    buildBreadcrumbs(site, page, canonical),
    pageObject,
  ]
}

export function serializeJsonLd(value: readonly JsonLdObject[]): string {
  return JSON.stringify(value)
    .replaceAll('<', '\\u003c')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029')
}
