import {
  SITE_A_APPLICATION_IDENTITIES,
} from '@/lib/applications/content-manifest'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import type {
  EditorialLink,
  EditorialLinkResolver,
  EditorialTarget,
} from '@/lib/editorial/types'
import {
  ProductPageContractError,
  toProductDetailPageDto,
  toProductFamilyPageDto,
  toProductsHubPageDto,
} from '@/lib/products/page-dto'
import {APPROVED_PRODUCTS_HUB_PRESENTATION} from '@/lib/products/page-schema'
import {
  SITE_A_PRODUCT_FAMILIES,
  SITE_A_PRODUCT_IDENTITIES,
  resolveProductPageIdentity,
  type ProductPageIdentity,
} from '@/lib/products/page-graph'
import type {
  ProductExperiencePageDto,
  ProductPageResolver,
} from '@/lib/products/page-types'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {htmlToPlainText} from '@/lib/seo/text'
import type {SiteConfig} from '@/sites'

import {
  productDetailTag,
  productFamilyTag,
  productsHubTag,
  routeTag,
  siteTag,
} from './cache-tags'
import {fetchGraphQL, GraphQLTimeoutError} from './client'
import {
  GetSiteProductDetailPageDocument,
  type GetSiteProductDetailPageQuery,
  type GetSiteProductDetailPageQueryVariables,
  GetSiteProductFamilyDocument,
  type GetSiteProductFamilyQuery,
  type GetSiteProductFamilyQueryVariables,
  GetSiteProductsHubDocument,
  type GetSiteProductsHubQuery,
  type GetSiteProductsHubQueryVariables,
} from './generated'

export const GET_SITE_PRODUCTS_HUB = GetSiteProductsHubDocument
export const GET_SITE_PRODUCT_FAMILY = GetSiteProductFamilyDocument
export const GET_SITE_PRODUCT_DETAIL_PAGE = GetSiteProductDetailPageDocument

const REPRESENTATIVE_MODIFIED = '2026-08-29T00:00:00'
const REPRESENTATIVE_PATH_LIST = [
  '/products',
  '/products/coatings',
  '/products/coatings/tp-c120',
] as const
const REPRESENTATIVE_PATHS = new Set<string>(REPRESENTATIVE_PATH_LIST)
const MAX_LAST_VALID_PAGES = REPRESENTATIVE_PATH_LIST.length

// Prototype-only process-local refresh resilience. This bounded store does not
// promise continuity across workers or process restarts.
const lastValidPages = new Map<string, ProductExperiencePageDto>()

export interface SerializedCollectionLink {
  readonly databaseId: number
  readonly title: string
  readonly path: string
}

export interface SerializedProductsHub {
  readonly siteId: string
  readonly level: string
  readonly path: string
  readonly metaTitle: string
  readonly metaDescription: string
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly heroImageId: number
  readonly decisionRail: readonly string[]
  readonly familyCount: number
  readonly productCount: number
  readonly families: ReadonlyArray<{
    readonly slug: string
    readonly name: string
    readonly path: string
    readonly directAnswer: string
    readonly productCount: number
  }>
  readonly knownGradeHeading: string
  readonly knownGradeHelp: string
  readonly decisionPath: string
  readonly applicationBoundary: string
  readonly resources: readonly SerializedCollectionLink[]
  readonly enquiry: string
  readonly faqItems: ReadonlyArray<{readonly question: string; readonly answer: string}>
  readonly technicalDisclaimer: string
}

export interface SerializedProductFamily {
  readonly siteId: string
  readonly level: string
  readonly path: string
  readonly slug: string
  readonly name: string
  readonly metaTitle: string
  readonly metaDescription: string
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly heroImageId: number
  readonly decisionRail: readonly string[]
  readonly filters: ReadonlyArray<{readonly slug: string; readonly label: string}>
  readonly comparisonCaption: string
  readonly selectionMethod: string
  readonly validationSteps: readonly string[]
  readonly products: ReadonlyArray<{
    readonly databaseId: number
    readonly productId: string
    readonly slug: string
    readonly title: string
    readonly path: string
    readonly displayOrder: number
    readonly familyCardSummary: string
    readonly applicationFocus: string
    readonly performanceFocus: string
    readonly surfaceTreatmentPositioning: string
    readonly filterTags: readonly string[]
  }>
  readonly applications: readonly SerializedCollectionLink[]
  readonly resources: readonly SerializedCollectionLink[]
  readonly enquiry: string
  readonly faqItems: ReadonlyArray<{readonly question: string; readonly answer: string}>
  readonly technicalDisclaimer: string
}

export interface SerializedDetailLink {
  readonly type: 'application' | 'resource' | 'product'
  readonly title: string
  readonly path: string
  readonly description?: string
}

export interface SerializedProductDetail {
  readonly slug: string
  readonly title: string
  readonly modifiedGmt: string
  readonly status: string
  readonly productId: string
  readonly familyName: string
  readonly metaTitle: string
  readonly metaDescription: string
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly productType: string
  readonly process: string
  readonly primaryApplication: string
  readonly positioning: string
  readonly surfaceTreatment: string
  readonly fitWhen: readonly string[]
  readonly discussFirstWhen: readonly string[]
  readonly formulationPriorities: ReadonlyArray<{
    readonly title: string
    readonly explanation: string
  }>
  readonly application: SerializedDetailLink | null
  readonly technicalNote: string
  readonly technicalProperties: ReadonlyArray<{
    readonly property: string
    readonly value: string
    readonly unit: string
    readonly displayOrder: number
  }>
  readonly validationSteps: readonly string[]
  readonly packaging: string
  readonly tdsAccess: string
  readonly faqs: ReadonlyArray<{readonly question: string; readonly answer: string}>
  readonly relatedProducts: readonly SerializedDetailLink[]
  readonly relatedResources: readonly SerializedDetailLink[]
  readonly enquiryItems: readonly string[]
  readonly technicalDisclaimer: string
}

function isExactSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

function contractError(path: string): ProductPageContractError {
  return new ProductPageContractError([path])
}

function parseJson<T>(value: string, path: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw contractError(path)
  }
}

function parseJsonRows<T>(values: readonly string[], path: string): T[] {
  return values.map((value, index) => parseJson<T>(value, `${path}.${index}`))
}

function humanTitle(value: string): string {
  return value
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ')
}

const applicationTargetsByPath = new Map<string, EditorialTarget>(
  SITE_A_APPLICATION_IDENTITIES.map(([id, , path]) => [
    path,
    {type: 'application' as const, id},
  ]),
)
const resourceTargetsByPath = new Map<string, EditorialTarget>(
  SITE_A_RESOURCE_IDENTITIES.map(([id, , path]) => [
    path,
    {type: 'resource' as const, id},
  ]),
)

function targetForPath(
  type: EditorialTarget['type'],
  path: string,
): EditorialTarget | null {
  const normalized = normalizeEditorialInternalPath(path)
  if (!normalized) return null
  if (type === 'application') return applicationTargetsByPath.get(normalized) ?? null
  if (type === 'resource') return resourceTargetsByPath.get(normalized) ?? null
  const identity = resolveProductPageIdentity(normalized)
  return identity ? {type: 'product', id: identity.id} : null
}

function baseEditorialLinks(): Map<string, EditorialLink> {
  const links = new Map<string, EditorialLink>()
  const add = (target: EditorialTarget, title: string, path: string) => {
    links.set(`${target.type}:${target.id}`, {
      ...target,
      title,
      path,
      href:
        target.type !== 'product' || REPRESENTATIVE_PATHS.has(path)
          ? path
          : null,
    })
  }
  for (const [id, , path] of SITE_A_APPLICATION_IDENTITIES) {
    add({type: 'application', id}, humanTitle(id), path)
  }
  for (const [id, , path] of SITE_A_RESOURCE_IDENTITIES) {
    add({type: 'resource', id}, humanTitle(id), path)
  }
  for (const identity of SITE_A_PRODUCT_IDENTITIES) {
    const family = SITE_A_PRODUCT_FAMILIES.find(
      ({slug}) => slug === identity.familySlug,
    )
    add(
      {type: 'product', id: identity.id},
      identity.level === 'family'
        ? family?.title ?? humanTitle(identity.id)
        : identity.level === 'hub'
          ? 'Titanium Dioxide Products'
          : identity.id,
      identity.path,
    )
  }
  return links
}

function productPageResolver(site: SiteConfig): {
  readonly resolver: ProductPageResolver
  readonly register: (
    target: EditorialTarget,
    title: string,
    path: string,
  ) => void
} {
  const links = baseEditorialLinks()
  const register = (target: EditorialTarget, title: string, path: string) => {
    const canonical =
      target.type === 'product'
        ? resolveProductPageIdentity(path)?.path
        : resolveCanonicalEditorialTarget(target.type, target.id)?.path
    const normalized = normalizeEditorialInternalPath(path)
    const plainTitle = htmlToPlainText(title).trim()
    if (!canonical || normalized !== canonical || !plainTitle) {
      throw contractError('relationships')
    }
    links.set(`${target.type}:${target.id}`, {
      ...target,
      title: plainTitle,
      path: canonical,
      href:
        target.type !== 'product' || REPRESENTATIVE_PATHS.has(canonical)
          ? canonical
          : null,
    })
  }
  const editorial: EditorialLinkResolver = (target) =>
    links.get(`${target.type}:${target.id}`) ?? null
  return {
    register,
    resolver: {
      editorial,
      ctaHref: () => site.rfqHref,
    },
  }
}

function targetFromCollectionLink(
  link: SerializedCollectionLink,
  type: 'application' | 'resource',
  register: (target: EditorialTarget, title: string, path: string) => void,
): EditorialTarget {
  if (!Number.isSafeInteger(link.databaseId) || link.databaseId <= 0) {
    throw contractError('relationships.databaseId')
  }
  const target = targetForPath(type, link.path)
  if (!target) throw contractError('relationships.path')
  register(target, link.title, link.path)
  return target
}

function assertRepresentativeIdentity(path: string): ProductPageIdentity | null {
  if (!REPRESENTATIVE_PATHS.has(path)) return null
  return resolveProductPageIdentity(path)
}

export function toProductsHubDtoFromSerialized(
  raw: SerializedProductsHub,
  site: SiteConfig,
): ProductExperiencePageDto {
  if (
    raw.siteId !== site.id ||
    raw.level !== 'hub' ||
    raw.path !== '/products' ||
    raw.familyCount !== 8 ||
    raw.productCount !== 25 ||
    raw.heroImageId <= 0
  ) {
    throw contractError('identity')
  }
  const {resolver, register} = productPageResolver(site)
  const resources = raw.resources.map((link) =>
    targetFromCollectionLink(link, 'resource', register),
  )
  return toProductsHubPageDto(
    {
      level: 'hub',
      identity: {
        id: 'products-hub',
        title: 'Titanium Dioxide Products',
        slug: 'products',
        path: raw.path,
        modified: REPRESENTATIVE_MODIFIED,
      },
      seo: {title: raw.metaTitle, description: raw.metaDescription},
      hero: {
        eyebrow: raw.eyebrow,
        headline: raw.headline,
        directAnswer: raw.directAnswer,
        image: '/site-a/products/products-hub-hero.jpg',
      },
      presentation: {
        breadcrumb: {...APPROVED_PRODUCTS_HUB_PRESENTATION.breadcrumb},
        hero: {
          ...APPROVED_PRODUCTS_HUB_PRESENTATION.hero,
          enquiryAction: {
            ...APPROVED_PRODUCTS_HUB_PRESENTATION.hero.enquiryAction,
          },
        },
        families: {...APPROVED_PRODUCTS_HUB_PRESENTATION.families},
        knownGrade: {
          ...APPROVED_PRODUCTS_HUB_PRESENTATION.knownGrade,
          heading: raw.knownGradeHeading,
          help: raw.knownGradeHelp,
        },
        decisionPath: {...APPROVED_PRODUCTS_HUB_PRESENTATION.decisionPath},
        applicationBoundary: {
          ...APPROVED_PRODUCTS_HUB_PRESENTATION.applicationBoundary,
        },
        resources: {
          eyebrow: APPROVED_PRODUCTS_HUB_PRESENTATION.resources.eyebrow,
          heading: APPROVED_PRODUCTS_HUB_PRESENTATION.resources.heading,
          cards: APPROVED_PRODUCTS_HUB_PRESENTATION.resources.cards.map(
            (card) => ({...card}),
          ),
        },
        enquiryContextFields: [
          ...APPROVED_PRODUCTS_HUB_PRESENTATION.enquiryContextFields,
        ],
        faq: {...APPROVED_PRODUCTS_HUB_PRESENTATION.faq},
        disclaimerLabel:
          APPROVED_PRODUCTS_HUB_PRESENTATION.disclaimerLabel,
        footerDescription:
          APPROVED_PRODUCTS_HUB_PRESENTATION.footerDescription,
      },
      decisionRail: parseJsonRows(raw.decisionRail, 'decisionRail'),
      families: raw.families.map((family) => ({
        slug: family.slug,
        title: family.name,
        summary: htmlToPlainText(family.directAnswer),
        count: family.productCount,
      })),
      knownGrades: SITE_A_PRODUCT_IDENTITIES.flatMap((identity) => {
        if (
          identity.level !== 'detail' ||
          !identity.familySlug ||
          !identity.productSlug
        ) return []
        const family = SITE_A_PRODUCT_FAMILIES.find(
          ({slug}) => slug === identity.familySlug,
        )
        return [{
          productId: identity.id,
          productSlug: identity.productSlug,
          familySlug: identity.familySlug,
          familyTitle: family?.title ?? '',
        }]
      }),
      decisionPath: parseJson(raw.decisionPath, 'decisionPath'),
      applicationBoundary: parseJson(
        raw.applicationBoundary,
        'applicationBoundary',
      ),
      resources,
      enquiry: parseJson(raw.enquiry, 'enquiry'),
      faqs: raw.faqItems.map(({question, answer}) => ({
        question,
        answerHtml: answer,
      })),
      disclaimerHtml: raw.technicalDisclaimer,
    },
    resolver,
  )
}

export function toProductFamilyDtoFromSerialized(
  raw: SerializedProductFamily,
  identity: ProductPageIdentity,
  site: SiteConfig,
): ProductExperiencePageDto {
  if (
    identity.level !== 'family' ||
    !identity.familySlug ||
    raw.siteId !== site.id ||
    raw.level !== 'family' ||
    raw.path !== identity.path ||
    raw.slug !== identity.familySlug ||
    raw.heroImageId <= 0
  ) {
    throw contractError('identity')
  }
  const {resolver, register} = productPageResolver(site)
  const applications = raw.applications.map((link) =>
    targetFromCollectionLink(link, 'application', register),
  )
  const resources = raw.resources.map((link) =>
    targetFromCollectionLink(link, 'resource', register),
  )
  for (const product of raw.products) {
    const target = targetForPath('product', product.path)
    if (!target || target.id !== product.productId) {
      throw contractError('products')
    }
    register(target, product.title, product.path)
  }
  const products = raw.products.map((product) => ({
    productId: product.productId,
    productSlug: product.slug,
    displayOrder: product.displayOrder,
    cardSummary: product.familyCardSummary,
    applicationFocus: product.applicationFocus,
    performanceFocus: product.performanceFocus,
    surfaceTreatmentPositioning: product.surfaceTreatmentPositioning,
    filterTags: [...product.filterTags],
  }))
  return toProductFamilyPageDto(
    {
      level: 'family',
      identity: {
        id: identity.id,
        title: raw.name,
        slug: raw.slug,
        path: raw.path,
        modified: REPRESENTATIVE_MODIFIED,
        familySlug: identity.familySlug,
      },
      seo: {title: raw.metaTitle, description: raw.metaDescription},
      hero: {
        eyebrow: raw.eyebrow,
        headline: raw.headline,
        directAnswer: raw.directAnswer,
        image: '/site-a/products/coatings-family-hero.png',
      },
      decisionRail: parseJsonRows(raw.decisionRail, 'decisionRail'),
      filters: raw.filters.map((filter) => ({...filter})),
      products,
      comparison: {caption: raw.comparisonCaption, products},
      selectionMethod: parseJson(raw.selectionMethod, 'selectionMethod'),
      validationSteps: parseJsonRows(raw.validationSteps, 'validationSteps'),
      applications,
      resources,
      enquiry: parseJson(raw.enquiry, 'enquiry'),
      faqs: raw.faqItems.map(({question, answer}) => ({
        question,
        answerHtml: answer,
      })),
      disclaimerHtml: raw.technicalDisclaimer,
    },
    resolver,
  )
}

export function toProductDetailDtoFromSerialized(
  raw: SerializedProductDetail,
  identity: ProductPageIdentity,
  site: SiteConfig,
): ProductExperiencePageDto {
  const family = SITE_A_PRODUCT_FAMILIES.find(
    ({slug}) => slug === identity.familySlug,
  )
  if (
    identity.level !== 'detail' ||
    !identity.familySlug ||
    !identity.productSlug ||
    raw.status === '' ||
    raw.slug !== identity.productSlug ||
    raw.productId !== identity.id ||
    raw.familyName !== family?.title
  ) {
    throw contractError('identity')
  }
  const {resolver, register} = productPageResolver(site)
  const registerDetailLink = (link: SerializedDetailLink): EditorialTarget => {
    const target = targetForPath(link.type, link.path)
    if (!target) throw contractError('relationships')
    register(target, link.title, link.path)
    return target
  }
  const application = raw.application && registerDetailLink(raw.application)
  if (!application || application.type !== 'application') {
    throw contractError('applicationContext.application')
  }
  const relatedProducts = raw.relatedProducts.map(registerDetailLink)
  const relatedResources = raw.relatedResources.map(registerDetailLink)
  return toProductDetailPageDto(
    {
      level: 'detail',
      identity: {
        id: identity.id,
        title: htmlToPlainText(raw.title),
        slug: identity.productSlug,
        path: identity.path,
        modified: raw.modifiedGmt,
        productId: raw.productId,
        familySlug: identity.familySlug,
      },
      seo: {title: raw.metaTitle, description: raw.metaDescription},
      hero: {
        eyebrow: raw.eyebrow,
        headline: raw.headline,
        directAnswer: raw.directAnswer,
        image: '/site-a/products/tp-c120-hero.png',
        ctas: [
          {kind: 'request-tds', label: 'Request a TDS'},
          {kind: 'discuss-application', label: 'Discuss Your Application'},
        ],
      },
      decisionRail: [
        {index: '01', label: 'Identity'},
        {index: '02', label: 'Technical Data'},
        {index: '03', label: 'Formulation Trial'},
        {index: '04', label: 'Enquiry'},
      ],
      snapshot: [
        {label: 'Product type', value: raw.productType},
        {label: 'Process', value: raw.process},
        {label: 'Primary application', value: raw.primaryApplication},
        {label: 'Positioning', value: raw.positioning},
        {label: 'Surface treatment', value: raw.surfaceTreatment},
      ],
      technicalProperties: raw.technicalProperties.map((property) => ({
        ...property,
      })),
      technicalNote: htmlToPlainText(raw.technicalNote),
      fitCheck: {
        fitWhen: [...raw.fitWhen],
        discussFirstWhen: [...raw.discussFirstWhen],
      },
      formulationPriorities: raw.formulationPriorities.map((item) => ({...item})),
      validationSteps: parseJsonRows(raw.validationSteps, 'validationSteps'),
      applicationContext: {
        eyebrow: 'Application Context',
        heading: `Connect ${raw.productId} to the complete application system`,
        description: raw.application.description ?? '',
        application,
      },
      enquiryPreparation: {
        items: [...raw.enquiryItems],
        packaging: raw.packaging,
        tdsAccess: raw.tdsAccess,
        ctas: [
          {kind: 'request-tds', label: 'Request a TDS'},
          {kind: 'discuss-application', label: 'Discuss Your Application'},
          {kind: 'request-sample', label: 'Request a Sample'},
        ],
      },
      faqs: raw.faqs.map(({question, answer}) => ({
        question,
        answerHtml: answer,
      })),
      relatedLinks: {
        products: relatedProducts,
        resources: relatedResources,
        family: {type: 'product', id: identity.familySlug},
      },
      finalCtas: [
        {kind: 'request-tds', label: 'Request a TDS'},
        {kind: 'discuss-application', label: 'Discuss Your Application'},
      ],
      disclaimerHtml: raw.technicalDisclaimer,
    },
    resolver,
  )
}

function hasOnlySiteScope(
  scopes: {readonly nodes: ReadonlyArray<{readonly slug: string | null}>} | null,
  siteId: string,
): boolean {
  return scopes?.nodes.length === 1 && scopes.nodes[0]?.slug === siteId
}

function publicRelationship(
  type: SerializedDetailLink['type'],
  node: {
    readonly title?: string | null
    readonly uri?: string | null
    readonly status?: string | null
    readonly siteScopes?: {
      readonly nodes: ReadonlyArray<{readonly slug: string | null}>
    } | null
    readonly excerpt?: string | null
  } | null | undefined,
  siteId: string,
): SerializedDetailLink | null {
  if (
    !node ||
    node.status !== 'publish' ||
    !hasOnlySiteScope(node.siteScopes ?? null, siteId) ||
    !node.uri ||
    !node.title
  ) return null
  const path = normalizeEditorialInternalPath(node.uri)
  if (!path || !targetForPath(type, path)) return null
  return {
    type,
    title: htmlToPlainText(node.title),
    path,
    ...(node.excerpt ? {description: htmlToPlainText(node.excerpt)} : {}),
  }
}

function detailFromGraphQL(
  data: GetSiteProductDetailPageQuery,
  identity: ProductPageIdentity,
  site: SiteConfig,
): SerializedProductDetail | null {
  const product = data.tio2Product
  const settings = data.tio2ProductSettings
  const fields = product?.productFields
  const expectedFamily = SITE_A_PRODUCT_FAMILIES.find(
    ({slug}) => slug === identity.familySlug,
  )
  const actualFamily = fields?.family?.nodes.find(({name}) => name?.trim())?.name
  if (
    !product ||
    !fields ||
    !settings ||
    product.status !== 'publish' ||
    product.slug !== identity.productSlug ||
    fields.productId !== identity.id ||
    actualFamily !== expectedFamily?.title ||
    !hasOnlySiteScope(product.siteScopes, site.wordpressScope)
  ) return null
  const application = fields.recommendedApplications?.nodes
    .map((node) => publicRelationship('application', node, site.wordpressScope))
    .find((link): link is SerializedDetailLink => !!link) ?? null
  return {
    slug: product.slug ?? '',
    title: product.title ?? '',
    modifiedGmt: product.modifiedGmt ?? '',
    status: product.status ?? '',
    productId: fields.productId ?? '',
    familyName: actualFamily ?? '',
    metaTitle: fields.metaTitle ?? '',
    metaDescription: fields.metaDescription ?? '',
    eyebrow: fields.eyebrow ?? '',
    headline: fields.customerProblemHeadline ?? '',
    directAnswer: fields.quickAnswer ?? '',
    productType: fields.productType ?? '',
    process: fields.process ?? '',
    primaryApplication: fields.primaryApplication ?? '',
    positioning: fields.positioning ?? '',
    surfaceTreatment: fields.surfaceTreatment ?? '',
    fitWhen: (fields.fitWhen ?? []).map((row) => row?.item ?? ''),
    discussFirstWhen: (fields.discussFirstWhen ?? []).map((row) => row?.item ?? ''),
    formulationPriorities: (fields.performancePriorities ?? []).map((row) => ({
      title: row?.title ?? '',
      explanation: row?.explanation ?? '',
    })),
    application,
    technicalNote: fields.evidenceStatement ?? '',
    technicalProperties: (fields.typicalProperties ?? []).map((row) => ({
      property: row?.property ?? '',
      value: row?.value ?? '',
      unit: row?.unit ?? '',
      displayOrder: row?.displayOrder ?? 0,
    })),
    validationSteps: (fields.validationChecklist ?? []).map(
      (row) => row?.item ?? '',
    ),
    packaging: fields.packaging ?? '',
    tdsAccess: fields.tdsAccess ?? '',
    faqs: (fields.faqItems ?? []).map((row) => ({
      question: row?.question ?? '',
      answer: row?.answer ?? '',
    })),
    relatedProducts: fields.relatedLinks?.products?.nodes.flatMap((node) => {
      const link = publicRelationship('product', node, site.wordpressScope)
      return link ? [link] : []
    }) ?? [],
    relatedResources: fields.relatedLinks?.resources?.nodes.flatMap((node) => {
      const link = publicRelationship('resource', node, site.wordpressScope)
      return link ? [link] : []
    }) ?? [],
    enquiryItems: settings.inquiryFields.map(({label}) => label),
    technicalDisclaimer: settings.technicalDisclaimer,
  }
}

function cacheKey(site: SiteConfig, path: string): string {
  return `${site.id}\n${path}`
}

function rememberLastValid(
  key: string,
  page: ProductExperiencePageDto,
): void {
  if (!lastValidPages.has(key) && lastValidPages.size >= MAX_LAST_VALID_PAGES) {
    return
  }
  lastValidPages.set(key, page)
}

export async function getSiteProductPage(
  site: SiteConfig,
  path: string,
): Promise<ProductExperiencePageDto | null> {
  const identity = assertRepresentativeIdentity(path)
  if (!isExactSiteA(site) || !identity || identity.path !== path) return null
  const key = cacheKey(site, path)
  try {
    let page: ProductExperiencePageDto | null
    if (identity.level === 'hub') {
      const data = await fetchGraphQL<
        GetSiteProductsHubQuery,
        GetSiteProductsHubQueryVariables
      >(
        GET_SITE_PRODUCTS_HUB,
        {siteId: site.wordpressScope},
        {tags: [siteTag(site.id), productsHubTag(site.id), routeTag(site.id, path)]},
      )
      const hub = data.tio2ProductsHub
      if (
        hub &&
        (hub.siteId !== site.id || hub.level !== 'hub' || hub.path !== path)
      ) return null
      page = hub
        ? toProductsHubDtoFromSerialized(hub, site)
        : null
    } else if (identity.level === 'family' && identity.familySlug) {
      const data = await fetchGraphQL<
        GetSiteProductFamilyQuery,
        GetSiteProductFamilyQueryVariables
      >(
        GET_SITE_PRODUCT_FAMILY,
        {siteId: site.wordpressScope, slug: identity.familySlug},
        {tags: [
          siteTag(site.id),
          productFamilyTag(site.id, identity.familySlug),
          routeTag(site.id, path),
        ]},
      )
      const family = data.tio2ProductFamily
      if (
        family &&
        (family.siteId !== site.id ||
          family.level !== 'family' ||
          family.path !== path ||
          family.slug !== identity.familySlug)
      ) return null
      page = family
        ? toProductFamilyDtoFromSerialized(family, identity, site)
        : null
    } else if (
      identity.level === 'detail' &&
      identity.familySlug &&
      identity.productSlug
    ) {
      const data = await fetchGraphQL<
        GetSiteProductDetailPageQuery,
        GetSiteProductDetailPageQueryVariables
      >(
        GET_SITE_PRODUCT_DETAIL_PAGE,
        {siteId: site.wordpressScope, slug: identity.productSlug},
        {tags: [
          siteTag(site.id),
          productDetailTag(site.id, identity.familySlug, identity.productSlug),
          routeTag(site.id, path),
        ]},
      )
      const detail = detailFromGraphQL(data, identity, site)
      page = detail
        ? toProductDetailDtoFromSerialized(detail, identity, site)
        : null
    } else {
      return null
    }
    if (page) rememberLastValid(key, page)
    return page
  } catch (error) {
    if (
      error instanceof ProductPageContractError ||
      error instanceof GraphQLTimeoutError
    ) {
      const previous = lastValidPages.get(key)
      if (previous) return previous
    }
    throw error
  }
}
