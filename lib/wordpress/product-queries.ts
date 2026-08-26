import {toProductPageDto} from '@/lib/products/dto'
import {normalizeProductInternalPath} from '@/lib/products/rich-text'
import type {ProductLink, ProductPageDto} from '@/lib/products/types'
import {htmlToPlainText} from '@/lib/seo/text'
import type {SiteConfig} from '@/sites'

import {
  productListTag,
  productTag,
  routeTag,
  siteTag,
  sitemapTag,
} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetSiteProductDocument,
  type GetSiteProductQuery,
  type GetSiteProductQueryVariables,
  type ProductApplicationLinkFieldsFragment,
  type ProductDocumentLinkFieldsFragment,
  type ProductLinkFieldsFragment,
  type SiteProductFieldsFragment,
} from './generated'

export const GET_SITE_PRODUCT = GetSiteProductDocument

interface SiteScopedRelationship {
  readonly status: string | null
  readonly siteScopes: {
    readonly nodes: ReadonlyArray<{readonly slug: string | null}>
  } | null
}

type GeneratedRelationship =
  | ProductApplicationLinkFieldsFragment
  | ProductDocumentLinkFieldsFragment
  | ProductLinkFieldsFragment

function isGeneratedRelationship(node: object): node is GeneratedRelationship {
  return (
    'title' in node &&
    'uri' in node &&
    'status' in node &&
    'siteScopes' in node
  )
}

function isApplicationRelationship(
  node: object,
): node is ProductApplicationLinkFieldsFragment {
  return isGeneratedRelationship(node) && 'excerpt' in node
}

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

function hasOnlySiteScope(
  node: Pick<SiteProductFieldsFragment, 'siteScopes'>,
  siteId: string,
): boolean {
  const siteIds =
    node.siteScopes?.nodes.flatMap(({slug}) => (slug ? [slug] : [])) ?? []
  return siteIds.length === 1 && siteIds[0] === siteId
}

function isPublishedRelationship(
  node: SiteScopedRelationship,
  siteId: string,
): boolean {
  return node.status === 'publish' && hasOnlySiteScope(node, siteId)
}

function optionalText(value: string | null): string | undefined {
  return value?.trim() ? value : undefined
}

function relationshipPath(value: string | null): string | null {
  return value ? normalizeProductInternalPath(value) : null
}

function toRelatedLink(
  node: GeneratedRelationship,
  siteId: string,
): ProductLink | null {
  if (!isPublishedRelationship(node, siteId)) return null
  const href = relationshipPath(node.uri)
  if (!href) return null
  return {title: htmlToPlainText(node.title ?? ''), href}
}

function relatedLinks(
  nodes: readonly (GeneratedRelationship | Record<PropertyKey, never>)[] |
    undefined,
  siteId: string,
): ProductLink[] {
  return (nodes ?? []).flatMap((node) => {
    if (!isGeneratedRelationship(node)) return []
    const link = toRelatedLink(node, siteId)
    return link ? [link] : []
  })
}

function toProductInput(
  product: SiteProductFieldsFragment,
  settings: NonNullable<GetSiteProductQuery['tio2ProductSettings']>,
) {
  const fields = product.productFields
  const slug = product.slug ?? ''
  const family = fields?.family?.nodes.find(({name}) => name?.trim())
  const recommendedApplications =
    fields?.recommendedApplications?.nodes.flatMap((node) => {
      if (
        !isApplicationRelationship(node) ||
        !isPublishedRelationship(node, 'tio2-a')
      ) {
        return []
      }
      const href = relationshipPath(node.uri)
      return [{
        title: htmlToPlainText(node.title ?? ''),
        fit: htmlToPlainText(node.excerpt ?? ''),
        ...(href ? {href} : {}),
      }]
    }) ?? []

  return {
    identity: {
      productId: fields?.productId,
      slug,
      path: `/products/${slug}`,
      title: htmlToPlainText(product.title ?? ''),
      family: family?.name,
      modified: product.modifiedGmt,
    },
    seo: {
      title: fields?.metaTitle,
      description: fields?.metaDescription,
    },
    hero: {
      eyebrow: fields?.eyebrow,
      problemHeadline: fields?.customerProblemHeadline,
      quickAnswer: fields?.quickAnswer,
    },
    snapshot: {
      productType: fields?.productType,
      process: fields?.process ?? '',
      primaryApplication: fields?.primaryApplication,
      positioning: fields?.positioning ?? '',
      surfaceTreatment: fields?.surfaceTreatment ?? '',
    },
    selection: {
      fitWhen: fields?.fitWhen?.map((row) => row?.item) ?? [],
      discussFirstWhen:
        fields?.discussFirstWhen?.map((row) => row?.item) ?? [],
    },
    performancePriorities:
      fields?.performancePriorities?.map((row) => ({
        title: row?.title,
        explanation: row?.explanation,
      })) ?? [],
    recommendedApplications,
    evidenceHtml: fields?.evidenceStatement,
    typicalProperties:
      fields?.typicalProperties?.map((row) => ({
        property: row?.property,
        value: row?.value,
        unit: row?.unit,
        ...(optionalText(row?.method ?? null) ? {method: row?.method} : {}),
        ...(optionalText(row?.note ?? null) ? {note: row?.note} : {}),
        displayOrder: row?.displayOrder,
      })) ?? [],
    validationChecklist:
      fields?.validationChecklist?.map((row) => row?.item) ?? [],
    enquiryFields: settings.inquiryFields.map((field) => ({...field})),
    packaging: fields?.packaging,
    tdsAccess: fields?.tdsAccess,
    ctas: {
      requestTds: {...settings.requestTdsCta},
      discussApplication: {...settings.discussApplicationCta},
    },
    faqs:
      fields?.faqItems?.map((row) => ({
        question: row?.question,
        answerHtml: row?.answer,
      })) ?? [],
    relatedLinks: {
      applications: relatedLinks(
        fields?.relatedLinks?.applications?.nodes,
        'tio2-a',
      ),
      resources: relatedLinks(
        fields?.relatedLinks?.resources?.nodes,
        'tio2-a',
      ),
      products: relatedLinks(
        fields?.relatedLinks?.products?.nodes,
        'tio2-a',
      ),
    },
    disclaimerHtml: settings.technicalDisclaimer,
  }
}

export async function getSiteProduct(
  site: SiteConfig,
  slug: string,
): Promise<ProductPageDto | null> {
  if (!isSiteA(site)) return null

  const path = `/products/${slug}`
  const data = await fetchGraphQL<
    GetSiteProductQuery,
    GetSiteProductQueryVariables
  >(
    GET_SITE_PRODUCT,
    {slug, siteId: site.wordpressScope},
    {
      tags: [
        siteTag(site.id),
        productTag(site.id, slug),
        productListTag(site.id),
        routeTag(site.id, path),
        sitemapTag(site.id),
      ],
    },
  )
  const product = data.tio2Product

  if (
    !product ||
    product.status !== 'publish' ||
    product.slug !== slug ||
    !hasOnlySiteScope(product, site.wordpressScope)
  ) {
    return null
  }

  if (!data.tio2ProductSettings) {
    return toProductPageDto(null)
  }

  return toProductPageDto(toProductInput(product, data.tio2ProductSettings))
}
