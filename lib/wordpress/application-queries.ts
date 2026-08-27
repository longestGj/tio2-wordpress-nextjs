import {
  SITE_A_APPLICATION_IDENTITIES,
} from '@/lib/applications/content-manifest'
import {
  ApplicationContractError,
  toApplicationPageDto,
} from '@/lib/applications/dto'
import type {ApplicationPageDto} from '@/lib/applications/types'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import type {
  EditorialLink,
  EditorialLinkResolver,
  EditorialTarget,
} from '@/lib/editorial/types'
import {htmlToPlainText} from '@/lib/seo/text'
import type {SiteConfig} from '@/sites'
import {isPublicRoute} from '@/sites/public-routes'

import {
  applicationListTag,
  applicationTag,
  routeTag,
  siteTag,
} from './cache-tags'
import {fetchGraphQL} from './client'
import {
  GetSiteApplicationDocument,
  type GetSiteApplicationQuery,
  type GetSiteApplicationQueryVariables,
  type SiteApplicationFieldsFragment,
} from './generated'

export const GET_SITE_APPLICATION = GetSiteApplicationDocument

export type SiteAApplicationIdentity =
  (typeof SITE_A_APPLICATION_IDENTITIES)[number]

export interface SerializedEditorialLink {
  readonly targetType: string
  readonly targetKey: string
  readonly title: string
  readonly path: string
  readonly href: string | null
}

export interface SerializedApplicationFields {
  readonly applicationId: string
  readonly applicationLevel: string
  readonly family: string
  readonly parentApplication: SerializedEditorialLink | null
  readonly metaTitle: string
  readonly metaDescription: string
  readonly eyebrow: string
  readonly headline: string
  readonly directAnswer: string
  readonly applicationContext: string
  readonly buyerProblem: string
  readonly selectionFactors: readonly string[]
  readonly powderDataLimits: string
  readonly validationPlan: readonly string[]
  readonly customerInputs: readonly string[]
  readonly bodySections: ReadonlyArray<{
    readonly id: string
    readonly heading: string
    readonly html: string
  }>
  readonly faqItems: ReadonlyArray<{
    readonly question: string
    readonly answerHtml: string
  }>
  readonly childApplications: readonly SerializedEditorialLink[]
  readonly relatedApplications: readonly SerializedEditorialLink[]
  readonly relatedResources: readonly SerializedEditorialLink[]
  readonly relatedProducts: readonly SerializedEditorialLink[]
  readonly ctas: ReadonlyArray<{
    readonly kind: string
    readonly label: string
    readonly href: string
  }>
  readonly technicalDisclaimer: string
}

export interface SerializedApplicationRecord {
  readonly slug: string | null
  readonly title: string | null
  readonly modifiedGmt: string | null
  readonly status: string | null
  readonly siteScopes?: {
    readonly nodes: ReadonlyArray<{readonly slug: string | null}>
  } | null
  readonly fields: SerializedApplicationFields
}

const applicationByPath = new Map<string, SiteAApplicationIdentity>(
  SITE_A_APPLICATION_IDENTITIES.map((identity) => [identity[2], identity]),
)
export function applicationIdentityForPath(
  path: string,
): SiteAApplicationIdentity | null {
  const normalized = normalizeEditorialInternalPath(path)
  return normalized ? applicationByPath.get(normalized) ?? null : null
}

function isExactSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

function hasOnlySiteScope(
  node: Pick<SiteApplicationFieldsFragment, 'siteScopes'>,
  siteId: string,
): boolean {
  const scopes = node.siteScopes?.nodes
  return scopes?.length === 1 && scopes[0]?.slug === siteId
}

function validatedLink(
  raw: SerializedEditorialLink,
  expectedType: EditorialTarget['type'],
  siteId: string,
): {target: EditorialTarget; link: EditorialLink} {
  const canonical = resolveCanonicalEditorialTarget(
    raw.targetType,
    raw.targetKey,
  )
  const target = canonical?.target
  const canonicalPath = canonical?.path ?? ''
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
    throw new ApplicationContractError(['relationships'])
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
  fields: SerializedApplicationFields,
  siteId: string,
): {
  children: EditorialTarget[]
  relationships: EditorialTarget[]
  resolveTarget: EditorialLinkResolver
} {
  const links = new Map<string, EditorialLink>()
  const register = (
    raw: SerializedEditorialLink,
    expectedType: EditorialTarget['type'],
  ): EditorialTarget => {
    const {target, link} = validatedLink(raw, expectedType, siteId)
    const key = `${target.type}:${target.id}`
    if (links.has(key)) throw new ApplicationContractError(['relationships'])
    links.set(key, link)
    return target
  }
  const children = fields.childApplications.map((link) =>
    register(link, 'application'),
  )
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

export function toApplicationDtoFromSerialized(
  record: SerializedApplicationRecord,
  identity: SiteAApplicationIdentity,
  siteId: string,
): ApplicationPageDto {
  const [id, slug, path, level, family, parentId] = identity
  const fields = record.fields
  if (parentId === null) {
    if (fields.parentApplication !== null) {
      throw new ApplicationContractError(['identity.parentId'])
    }
  } else {
    if (!fields.parentApplication) {
      throw new ApplicationContractError(['identity.parentId'])
    }
    const parent = validatedLink(fields.parentApplication, 'application', siteId)
    if (parent.target.id !== parentId) {
      throw new ApplicationContractError(['identity.parentId'])
    }
  }
  const {children, relationships, resolveTarget} = relationshipRuntime(
    fields,
    siteId,
  )
  return toApplicationPageDto(
    {
      identity: {
        id,
        title: htmlToPlainText(record.title ?? ''),
        slug,
        path,
        level,
        family,
        parentId,
        modified: record.modifiedGmt,
      },
      seo: {title: fields.metaTitle, description: fields.metaDescription},
      hero: {
        eyebrow: fields.eyebrow,
        headline: fields.headline,
        directAnswer: fields.directAnswer,
      },
      decisionGuide: {
        context: fields.applicationContext,
        buyerProblem: fields.buyerProblem,
        selectionFactors: [...fields.selectionFactors],
        powderDataLimits: fields.powderDataLimits,
        validationPlan: [...fields.validationPlan],
        customerInputs: [...fields.customerInputs],
      },
      bodySections: fields.bodySections.map((section) => ({...section})),
      faqs: fields.faqItems.map((faq) => ({...faq})),
      children,
      relationships,
      ctas: fields.ctas.map((cta) => ({...cta})),
      disclaimerHtml: fields.technicalDisclaimer,
    },
    resolveTarget,
  )
}

export async function getSiteApplication(
  site: SiteConfig,
  path: string,
): Promise<ApplicationPageDto | null> {
  const identity = applicationIdentityForPath(path)
  if (!identity || !isExactSiteA(site) || !isPublicRoute(site.id, identity[2])) {
    return null
  }
  const [id, slug, canonicalPath, level, family] = identity
  const data = await fetchGraphQL<
    GetSiteApplicationQuery,
    GetSiteApplicationQueryVariables
  >(
    GET_SITE_APPLICATION,
    {slug},
    {
      tags: [
        siteTag(site.id),
        applicationTag(site.id, id),
        applicationListTag(site.id),
        routeTag(site.id, canonicalPath),
      ],
    },
  )
  const application = data.tio2Application
  const fields = application?.siteAApplicationFields
  if (
    !application ||
    !fields ||
    application.status !== 'publish' ||
    application.slug !== slug ||
    !hasOnlySiteScope(application, site.wordpressScope) ||
    fields.applicationId !== id ||
    fields.applicationLevel !== level ||
    fields.family !== family
  ) {
    return null
  }
  return toApplicationDtoFromSerialized(
    {...application, fields},
    identity,
    site.id,
  )
}
