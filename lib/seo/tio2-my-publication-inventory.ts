import inventoryData from './tio2-my-publication-inventory.data.json'

export type Tio2MyRobotsDirective = 'index, follow' | 'noindex, follow' | 'noindex, nofollow'

export interface Tio2MyLocaleRelation {
  readonly locale: 'en' | 'ms-MY' | 'pt-BR'
  readonly alternatePageId: string
  readonly hreflang: 'en' | 'ms-MY' | 'pt-BR'
  readonly alternateHreflang: 'en' | 'ms-MY' | 'pt-BR'
}

export interface Tio2MyPublicationPage {
  readonly pageId: string
  readonly pathname: string | null
  readonly publicAccess: true
  readonly indexingAuthorized: boolean
  readonly sitemapAuthorized: boolean
  readonly robots: Tio2MyRobotsDirective
  readonly expectedStatus: 200 | 404
  readonly siteScope: 'tio2-my'
  readonly primaryKeyword: string
  readonly title: string
  readonly metaDescription: string | null
  readonly h1: string
  readonly canonical: string | null
  readonly schemaTypes: readonly string[]
  readonly breadcrumbParent: string | null
  readonly primaryInternalLinkSources: readonly string[]
  readonly lastReviewedDate: '2026-09-13'
  readonly exceptionDirective: string
  readonly deliveryStatus: string
  readonly sourceManifest: string
  readonly localeRelation: Tio2MyLocaleRelation | null
}

function assertPublicationInventory(value: unknown): asserts value is Tio2MyPublicationPage[] {
  if (!Array.isArray(value) || value.length !== 59) {
    throw new Error('TiO2 Malaysia publication inventory must contain exactly 59 objects')
  }

  const pageIds = new Set<string>()
  const paths = new Set<string>()
  let indexableCount = 0

  for (const item of value) {
    if (!item || typeof item !== 'object') throw new Error('Publication inventory row is invalid')
    const page = item as Partial<Tio2MyPublicationPage>
    if (!page.pageId || pageIds.has(page.pageId)) throw new Error(`Duplicate publication page: ${page.pageId}`)
    if (page.siteScope !== 'tio2-my' || page.publicAccess !== true) {
      throw new Error(`Cross-site or non-public publication row: ${page.pageId}`)
    }
    pageIds.add(page.pageId)

    if (page.pathname !== null) {
      if (!page.pathname?.startsWith('/') || !page.pathname.endsWith('/') || /[?#]/.test(page.pathname)) {
        throw new Error(`Invalid publication path: ${page.pathname}`)
      }
      if (paths.has(page.pathname)) throw new Error(`Duplicate publication path: ${page.pathname}`)
      paths.add(page.pathname)
      if (page.canonical !== new URL(page.pathname, 'https://tio2malaysia.com').href) {
        throw new Error(`Non-self-canonical publication row: ${page.pageId}`)
      }
    }

    if (page.indexingAuthorized) {
      indexableCount += 1
      if (!page.sitemapAuthorized || page.robots !== 'index, follow') {
        throw new Error(`Indexing and Sitemap authorization diverge: ${page.pageId}`)
      }
    }
  }

  if (indexableCount !== 57) throw new Error('TiO2 Malaysia must have exactly 57 indexable pages')
}

assertPublicationInventory(inventoryData)

export const TIO2_MY_PUBLICATION_INVENTORY: readonly Tio2MyPublicationPage[] =
  Object.freeze(inventoryData)

const publicationByPageId = new Map(
  TIO2_MY_PUBLICATION_INVENTORY.map((page) => [page.pageId, page] as const),
)

const publicationByPath = new Map(
  TIO2_MY_PUBLICATION_INVENTORY
    .filter((page): page is Tio2MyPublicationPage & {readonly pathname: string} => page.pathname !== null)
    .map((page) => [page.pathname, page] as const),
)

export function getTio2MyPublicationPage(pageId: string): Tio2MyPublicationPage | undefined {
  return publicationByPageId.get(pageId)
}

export function getTio2MyPublicationPageByPath(pathname: string): Tio2MyPublicationPage | undefined {
  return publicationByPath.get(pathname)
}

export function getTio2MyIndexablePages(): readonly Tio2MyPublicationPage[] {
  return TIO2_MY_PUBLICATION_INVENTORY.filter(
    (page) => page.indexingAuthorized && page.sitemapAuthorized && page.pathname !== null,
  )
}
