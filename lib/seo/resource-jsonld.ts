import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig, SiteId} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

import {serializeJsonLd, type JsonLdObject} from './jsonld'
import {htmlToPlainText} from './text'

export type ResourceJsonLdNode = JsonLdObject
export type ResourceVisibility = (siteId: SiteId, path: string) => boolean

export interface ResourceBreadcrumbItem {
  readonly title: string
  readonly path: string
  readonly href: string | null
  readonly current: boolean
}

function safeText(value: string, maximumLength?: number): string {
  return htmlToPlainText(
    value,
    maximumLength ?? Math.max(Array.from(value).length, 1),
  ).replace(/\s+([,.;:!?])/gu, '$1')
}

export function buildResourceBreadcrumbItems(
  resource: TechnicalResourcePageDto,
  site: SiteConfig,
  visible: ResourceVisibility = isPublicRoute,
): ResourceBreadcrumbItem[] {
  const current = {
    title: resource.identity.title,
    path: resource.identity.path,
    href: visible(site.id, resource.identity.path)
      ? resource.identity.path
      : null,
    current: true,
  } as const

  return [
    {title: 'Home', path: '/', href: '/', current: false},
    ...(resource.identity.kind === 'article'
      ? [
          {
            title: 'Technical Resources',
            path: '/resources',
            href: visible(site.id, '/resources') ? '/resources' : null,
            current: false,
          },
        ]
      : []),
    current,
  ]
}

function visibleBreadcrumbs(
  resource: TechnicalResourcePageDto,
  site: SiteConfig,
  canonical: string,
  visible: ResourceVisibility,
): ResourceJsonLdNode {
  const items = buildResourceBreadcrumbItems(resource, site, visible).filter(
    (item) => item.href !== null,
  )

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    '@id': `${canonical}#breadcrumb`,
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: new URL('/', site.url).href,
      },
      ...items.slice(1).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: safeText(item.title, 180),
        item: new URL(item.path, site.url).href,
      })),
    ],
  }
}

export function buildResourceJsonLd(
  resource: TechnicalResourcePageDto,
  site: SiteConfig,
  visible: ResourceVisibility = isPublicRoute,
): ResourceJsonLdNode[] {
  const canonical = new URL(resource.identity.path, site.url).href
  const primary: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type':
      resource.identity.kind === 'article' ? 'TechArticle' : 'CollectionPage',
    '@id': `${canonical}#webpage`,
    name: safeText(resource.identity.title, 180),
    headline: safeText(resource.hero.headline, 180),
    description: safeText(resource.seo.description, 160),
    abstract: safeText(resource.hero.directAnswer),
    url: canonical,
    breadcrumb: {'@id': `${canonical}#breadcrumb`},
  }
  if (isStrictUtcInstant(resource.identity.modified)) {
    primary.dateModified = resource.identity.modified
  }
  const relatedLinks = [...resource.children, ...resource.relationships]
    .filter(
      (link) =>
        link.href !== null &&
        link.href === link.path &&
        visible(site.id, link.path),
    )
    .map((link) => new URL(link.path, site.url).href)
  if (relatedLinks.length > 0) primary.relatedLink = relatedLinks

  return [
    primary,
    visibleBreadcrumbs(resource, site, canonical, visible),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: resource.faqs.map((faq) => ({
        '@type': 'Question',
        name: safeText(faq.question, 180),
        acceptedAnswer: {
          '@type': 'Answer',
          text: safeText(faq.answerHtml),
        },
      })),
    },
  ]
}

export function serializeResourceJsonLd(
  values: readonly ResourceJsonLdNode[],
): string {
  return serializeJsonLd(values)
}
