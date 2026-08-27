import {
  SITE_A_APPLICATION_IDENTITIES,
} from '@/lib/applications/content-manifest'
import type {ApplicationPageDto} from '@/lib/applications/types'
import {assertCanonicalApplicationGraph} from '@/lib/applications/runtime'
import {isStrictUtcInstant} from '@/lib/wordpress/time'
import type {SiteConfig, SiteId} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

import {serializeJsonLd, type JsonLdObject} from './jsonld'
import {htmlToPlainText} from './text'

export type ApplicationJsonLdNode = JsonLdObject
export type ApplicationVisibility = (siteId: SiteId, path: string) => boolean

const identityById = new Map<
  string,
  (typeof SITE_A_APPLICATION_IDENTITIES)[number]
>(
  SITE_A_APPLICATION_IDENTITIES.map((identity) => [identity[0], identity]),
)

function safeText(value: string, maximumLength?: number): string {
  return htmlToPlainText(
    value,
    maximumLength ?? Math.max(Array.from(value).length, 1),
  ).replace(/\s+([,.;:!?])/gu, '$1')
}

function visibleBreadcrumbs(
  application: ApplicationPageDto,
  site: SiteConfig,
  canonical: string,
  visible: ApplicationVisibility,
): ApplicationJsonLdNode {
  const hierarchy: Array<readonly [string, string, string]> = []
  let parentId = application.identity.parentId
  while (parentId) {
    const parent = identityById.get(parentId)
    if (!parent) break
    hierarchy.unshift([parent[0], parent[1], parent[2]])
    parentId = parent[5]
  }
  const candidates = [
    ...hierarchy.map((identity) => ({name: identity[1], path: identity[2]})),
    {name: application.identity.title, path: application.identity.path},
  ].filter((item) => visible(site.id, item.path))

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
      ...candidates.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: safeText(item.name, 180),
        item: new URL(item.path, site.url).href,
      })),
    ],
  }
}

export function buildApplicationJsonLd(
  application: ApplicationPageDto,
  site: SiteConfig,
  visible: ApplicationVisibility = isPublicRoute,
): ApplicationJsonLdNode[] {
  assertCanonicalApplicationGraph(application)
  const canonical = new URL(application.identity.path, site.url).href
  const primary: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': application.identity.level === 'detail' ? 'WebPage' : 'CollectionPage',
    '@id': `${canonical}#webpage`,
    name: safeText(application.identity.title, 180),
    description: safeText(application.seo.description, 160),
    abstract: safeText(application.hero.directAnswer),
    url: canonical,
    breadcrumb: {'@id': `${canonical}#breadcrumb`},
  }
  if (isStrictUtcInstant(application.identity.modified)) {
    primary.dateModified = application.identity.modified
  }
  const relatedLinks = [...application.children, ...application.relationships]
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
    visibleBreadcrumbs(application, site, canonical, visible),
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      '@id': `${canonical}#faq`,
      mainEntity: application.faqs.map((faq) => ({
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

export function serializeApplicationJsonLd(
  values: readonly ApplicationJsonLdNode[],
): string {
  return serializeJsonLd(values)
}
