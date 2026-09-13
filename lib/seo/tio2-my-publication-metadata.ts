import type {Metadata} from 'next'

import {isPublicIndexingEnabled, type SeoEnvironment} from './metadata'
import {
  getTio2MyPublicationPage,
  type Tio2MyPublicationPage,
} from './tio2-my-publication-inventory'

function approvedLanguages(page: Tio2MyPublicationPage): Record<string, string> | undefined {
  const relation = page.localeRelation
  if (!relation || !page.canonical) return undefined

  const alternate = getTio2MyPublicationPage(relation.alternatePageId)
  if (!alternate?.canonical) throw new Error(`Missing locale alternate for ${page.pageId}`)

  const english = relation.hreflang === 'en' ? page.canonical : alternate.canonical
  return {
    [relation.hreflang]: page.canonical,
    [relation.alternateHreflang]: alternate.canonical,
    'x-default': english,
  }
}

export function buildTio2MyPublicationMetadata(
  pageId: string,
  env: SeoEnvironment = process.env,
): Metadata {
  const page = getTio2MyPublicationPage(pageId)
  if (!page) throw new Error(`Unknown TiO2 Malaysia publication page: ${pageId}`)

  const publicIndexing = page.indexingAuthorized && isPublicIndexingEnabled(env)
  const follow = publicIndexing || (page.pageId === 'SYS-404' && isPublicIndexingEnabled(env))
  const languages = approvedLanguages(page)

  return {
    title: page.title,
    description: page.metaDescription,
    ...(page.canonical ? {
      alternates: {
        canonical: page.canonical,
        ...(languages ? {languages} : {}),
      },
    } : {}),
    robots: {index: publicIndexing, follow},
    ...(page.canonical ? {
      openGraph: {
        type: 'website',
        url: page.canonical,
        siteName: 'TiO2 Malaysia',
        title: page.title,
        ...(page.metaDescription ? {description: page.metaDescription} : {}),
        images: [],
      },
      twitter: {
        card: 'summary',
        title: page.title,
        ...(page.metaDescription ? {description: page.metaDescription} : {}),
        images: [],
      },
    } : {}),
  }
}
