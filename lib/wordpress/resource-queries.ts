import {SITE_A_APPLICATION_IDENTITIES} from '@/lib/applications/content-manifest'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import type {
  EditorialLink,
  EditorialLinkResolver,
  EditorialTarget,
} from '@/lib/editorial/types'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'
import {
  SITE_A_RESOURCE_IDENTITIES,
} from '@/lib/resources/content-manifest'
import {
  ResourceContractError,
  toTechnicalResourcePageDto,
} from '@/lib/resources/dto'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import {htmlToPlainText} from '@/lib/seo/text'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

import {
  resourceListTag,
  resourceTag,
  routeTag,
  siteTag,
} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetSiteTechnicalResourceDocument,
  type GetSiteTechnicalResourceQuery,
  type GetSiteTechnicalResourceQueryVariables,
  type SiteTechnicalResourceFieldsFragment,
} from './generated'

export const GET_SITE_TECHNICAL_RESOURCE = GetSiteTechnicalResourceDocument

export type SiteAResourceIdentity = (typeof SITE_A_RESOURCE_IDENTITIES)[number]

export interface SerializedEditorialResourceLink {
  readonly targetType: string
  readonly targetKey: string
  readonly title: string
  readonly path: string
  readonly href: string | null
}

export interface SerializedResourceFields {
  readonly resourceId: string
  readonly resourceKind: string
  readonly cluster: string
  readonly metaTitle: string
  readonly metaDescription: string
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly keyTakeaways: readonly string[]
  readonly sections: ReadonlyArray<{
    readonly id: string
    readonly heading: string
    readonly html: string
  }>
  readonly comparisonTable: {
    readonly columns: readonly string[]
    readonly rows: ReadonlyArray<{readonly cells: readonly string[]}>
  } | null
  readonly practicalImplications: readonly string[]
  readonly commonMistakes: readonly string[]
  readonly evaluationMethod: readonly string[]
  readonly faqItems: ReadonlyArray<{
    readonly question: string
    readonly answerHtml: string
  }>
  readonly childResources: readonly SerializedEditorialResourceLink[]
  readonly relatedApplications: readonly SerializedEditorialResourceLink[]
  readonly relatedResources: readonly SerializedEditorialResourceLink[]
  readonly relatedProducts: readonly SerializedEditorialResourceLink[]
  readonly ctas: ReadonlyArray<{
    readonly kind: string
    readonly label: string
    readonly href: string
  }>
  readonly technicalDisclaimer: string
}

export interface SerializedResourceRecord {
  readonly slug: string | null
  readonly title: string | null
  readonly modifiedGmt: string | null
  readonly status: string | null
  readonly siteScopes?: {
    readonly nodes: ReadonlyArray<{readonly slug: string | null}>
  } | null
  readonly fields: SerializedResourceFields
}

const resourceByPath = new Map<string, SiteAResourceIdentity>(
  SITE_A_RESOURCE_IDENTITIES.map((identity) => [identity[2], identity]),
)
const resourceById = new Map<string, SiteAResourceIdentity>(
  SITE_A_RESOURCE_IDENTITIES.map((identity) => [identity[0], identity]),
)
const applicationById = new Map<
  string,
  (typeof SITE_A_APPLICATION_IDENTITIES)[number]
>(
  SITE_A_APPLICATION_IDENTITIES.map((identity) => [identity[0], identity]),
)
const productIds = new Set<string>(SITE_A_PRODUCT_IDS)

export function resourceIdentityForPath(path: string): SiteAResourceIdentity | null {
  const normalized = normalizeEditorialInternalPath(path)
  return normalized ? resourceByPath.get(normalized) ?? null : null
}

function isExactSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

function hasOnlySiteScope(
  node: Pick<SiteTechnicalResourceFieldsFragment, 'siteScopes'>,
  siteId: string,
): boolean {
  const scopes = node.siteScopes?.nodes
  return scopes?.length === 1 && scopes[0]?.slug === siteId
}

function canonicalTarget(targetType: string, targetKey: string): EditorialTarget | null {
  if (targetType === 'application') {
    return applicationById.has(targetKey)
      ? {type: 'application', id: targetKey}
      : null
  }
  if (targetType === 'resource') {
    return resourceById.has(targetKey) ? {type: 'resource', id: targetKey} : null
  }
  if (targetType === 'product') {
    return productIds.has(targetKey) ? {type: 'product', id: targetKey} : null
  }
  return null
}

function canonicalTargetPath(target: EditorialTarget): string {
  if (target.type === 'application') {
    return applicationById.get(target.id)?.[2] ?? ''
  }
  if (target.type === 'resource') {
    return resourceById.get(target.id)?.[2] ?? ''
  }
  return `/products/${target.id.toLowerCase()}`
}

function validatedLink(
  raw: SerializedEditorialResourceLink,
  expectedType: EditorialTarget['type'],
  siteId: string,
): {target: EditorialTarget; link: EditorialLink} {
  const target = canonicalTarget(raw.targetType, raw.targetKey)
  const canonicalPath = target ? canonicalTargetPath(target) : ''
  const title = raw.title.trim()
  if (
    !target ||
    target.type !== expectedType ||
    !canonicalPath ||
    raw.path !== canonicalPath ||
    !title ||
    htmlToPlainText(title) !== title ||
    (raw.href !== null &&
      (raw.href !== canonicalPath || !isPublicRoute(siteId as 'tio2-a', canonicalPath)))
  ) {
    throw new ResourceContractError(['relationships'])
  }
  return {
    target,
    link: {
      type: target.type,
      id: target.id,
      title,
      path: canonicalPath,
      href: raw.href,
    },
  }
}

function relationshipRuntime(
  fields: SerializedResourceFields,
  siteId: string,
): {
  children: EditorialTarget[]
  relationships: EditorialTarget[]
  resolveTarget: EditorialLinkResolver
} {
  const links = new Map<string, EditorialLink>()
  const register = (
    raw: SerializedEditorialResourceLink,
    expectedType: EditorialTarget['type'],
  ): EditorialTarget => {
    const {target, link} = validatedLink(raw, expectedType, siteId)
    const key = `${target.type}:${target.id}`
    if (links.has(key)) throw new ResourceContractError(['relationships'])
    links.set(key, link)
    return target
  }
  const children = fields.childResources.map((link) => register(link, 'resource'))
  const relationships = [
    ...fields.relatedApplications.map((link) => register(link, 'application')),
    ...fields.relatedResources.map((link) => register(link, 'resource')),
    ...fields.relatedProducts.map((link) => register(link, 'product')),
  ]
  return {
    children,
    relationships,
    resolveTarget: (target) => links.get(`${target.type}:${target.id}`) ?? null,
  }
}

export function toResourceDtoFromSerialized(
  record: SerializedResourceRecord,
  identity: SiteAResourceIdentity,
  siteId: string,
): TechnicalResourcePageDto {
  const [id, slug, path, kind, cluster] = identity
  const fields = record.fields
  const {children, relationships, resolveTarget} = relationshipRuntime(
    fields,
    siteId,
  )
  return toTechnicalResourcePageDto(
    {
      identity: {
        id,
        title: htmlToPlainText(record.title ?? ''),
        slug,
        path,
        kind,
        cluster,
        modified: record.modifiedGmt,
      },
      seo: {title: fields.metaTitle, description: fields.metaDescription},
      hero: {
        eyebrow: fields.eyebrow,
        headline: fields.headline,
        directAnswer: fields.directAnswer,
      },
      keyTakeaways: [...fields.keyTakeaways],
      sections: fields.sections.map((section) => ({...section})),
      comparisonTable: fields.comparisonTable
        ? {
            columns: [...fields.comparisonTable.columns],
            rows: fields.comparisonTable.rows.map(({cells}) => [...cells]),
          }
        : null,
      practicalImplications: [...fields.practicalImplications],
      commonMistakes: [...fields.commonMistakes],
      evaluationMethod: [...fields.evaluationMethod],
      faqs: fields.faqItems.map((faq) => ({...faq})),
      children,
      relationships,
      ctas: fields.ctas.map((cta) => ({...cta})),
      disclaimerHtml: fields.technicalDisclaimer,
    },
    resolveTarget,
  )
}

export async function getSiteResource(
  site: SiteConfig,
  path: string,
): Promise<TechnicalResourcePageDto | null> {
  const identity = resourceIdentityForPath(path)
  if (!identity || !isExactSiteA(site) || !isPublicRoute(site.id, identity[2])) {
    return null
  }
  const [id, slug, canonicalPath, kind, cluster] = identity
  const data = await fetchGraphQL<
    GetSiteTechnicalResourceQuery,
    GetSiteTechnicalResourceQueryVariables
  >(
    GET_SITE_TECHNICAL_RESOURCE,
    {slug},
    {
      tags: [
        siteTag(site.id),
        resourceTag(site.id, id),
        resourceListTag(site.id),
        routeTag(site.id, canonicalPath),
      ],
    },
  )
  const resource = data.tio2Document
  const fields = resource?.siteATechnicalResourceFields
  if (
    !resource ||
    !fields ||
    resource.status !== 'publish' ||
    resource.slug !== slug ||
    !hasOnlySiteScope(resource, site.wordpressScope) ||
    fields.resourceId !== id ||
    fields.resourceKind !== kind ||
    fields.cluster !== cluster
  ) {
    return null
  }
  return toResourceDtoFromSerialized(
    {...resource, fields},
    identity,
    site.id,
  )
}
