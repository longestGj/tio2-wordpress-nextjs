import type {ComponentType} from 'react'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {
  containsForbiddenEditorialClaim,
  containsPrivateEditorialLocation,
  hasEditorialRichTextContent,
  normalizeEditorialInternalPath,
  sanitizeEditorialRichText,
} from '@/lib/editorial/rich-text'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {technicalResourcePageInputSchema} from '@/lib/resources/schema'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'

import {ResourceArticle} from './resource-article'
import {ResourceHub} from './resource-hub'

interface TechnicalResourcePageRendererProps {
  readonly resource: TechnicalResourcePageDto
}

type ResourceRenderer = ComponentType<{
  readonly resource: TechnicalResourcePageDto
}>

const RESOURCE_RENDERERS: Readonly<
  Partial<Record<TechnicalResourcePageDto['identity']['kind'], ResourceRenderer>>
> = Object.freeze({
  hub: ResourceHub,
  article: ResourceArticle,
})

const resourceIdentityById = new Map<
  string,
  (typeof SITE_A_RESOURCE_IDENTITIES)[number]
>(
  SITE_A_RESOURCE_IDENTITIES.map((identity) => [identity[0], identity]),
)
const expectedHubChildren = SITE_A_RESOURCE_IDENTITIES.slice(1).map(
  ([id]) => id,
)

function populated(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function populatedArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && value.length > 0
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function safePlainText(value: unknown): value is string {
  if (!populated(value) || value !== value.trim()) return false
  return (
    !/(?:<!--|<![a-z]|<\?|<\/?[a-z][^>]*(?:>|$))/iu.test(value) &&
    !containsPrivateEditorialLocation(value) &&
    !containsForbiddenEditorialClaim(value)
  )
}

function safeRichText(value: unknown): value is string {
  if (!populated(value)) return false
  const sanitized = sanitizeEditorialRichText(value)
  return sanitized === value && hasEditorialRichTextContent(sanitized)
}

function safeCanonicalPath(value: unknown): value is string {
  if (typeof value !== 'string') return false
  return (
    normalizeEditorialInternalPath(value) === value &&
    !containsPrivateEditorialLocation(value) &&
    !containsForbiddenEditorialClaim(value)
  )
}

function safePlainStrings(value: unknown): value is readonly string[] {
  return populatedArray(value) && value.every(safePlainText)
}

function completeSections(value: unknown): boolean {
  return (
    populatedArray(value) &&
    value.every(
      (section) =>
        isRecord(section) &&
        populated(section.id) &&
        safePlainText(section.heading) &&
        safeRichText(section.html),
    )
  )
}

function completeComparisonTable(value: unknown): boolean {
  if (value === null) return true
  if (!isRecord(value) || !safePlainStrings(value.columns)) return false
  const columnCount = value.columns.length
  return (
    populatedArray(value.rows) &&
    value.rows.every(
      (row) =>
        Array.isArray(row) &&
        row.length === columnCount &&
        row.every(safePlainText),
    )
  )
}

function completeFaqs(value: unknown): boolean {
  return (
    populatedArray(value) &&
    value.every(
      (faq) =>
        isRecord(faq) &&
        safePlainText(faq.question) &&
        safeRichText(faq.answerHtml),
    )
  )
}

function completeLinks(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.every((link) => {
      if (
        !isRecord(link) ||
        Object.keys(link).sort().join(',') !== 'href,id,path,title,type' ||
        typeof link.type !== 'string' ||
        typeof link.id !== 'string'
      ) {
        return false
      }
      const canonical = resolveCanonicalEditorialTarget(link.type, link.id)
      return Boolean(
        canonical &&
          safePlainText(link.title) &&
          safeCanonicalPath(link.path) &&
          link.path === canonical.path &&
          (link.href === null ||
            (safeCanonicalPath(link.href) && link.href === canonical.path)),
      )
    })
  )
}

function completeCtas(value: unknown): boolean {
  return (
    populatedArray(value) &&
    value.every(
      (cta) =>
        isRecord(cta) &&
        ['request-tds', 'discuss-application'].includes(String(cta.kind)) &&
        safePlainText(cta.label) &&
        safeCanonicalPath(cta.href),
    )
  )
}

function hasCanonicalIdentity(resource: TechnicalResourcePageDto): boolean {
  const expected = resourceIdentityById.get(resource.identity.id)
  return Boolean(
    expected &&
      resource.identity.slug === expected[1] &&
      resource.identity.path === expected[2] &&
      resource.identity.kind === expected[3] &&
      resource.identity.cluster === expected[4],
  )
}

function hasCanonicalChildren(resource: TechnicalResourcePageDto): boolean {
  const actual = resource.children.map(({type, id}) =>
    type === 'resource' ? id : '',
  )
  return resource.identity.kind === 'hub'
    ? actual.length === expectedHubChildren.length &&
        actual.every((id, index) => id === expectedHubChildren[index])
    : actual.length === 0
}

function matchesAuthoritativeContract(resource: TechnicalResourcePageDto): boolean {
  return technicalResourcePageInputSchema.safeParse({
    ...resource,
    children: resource.children.map(({type, id}) => ({type, id})),
    relationships: resource.relationships.map(({type, id}) => ({type, id})),
  }).success
}

function isCompleteResource(
  resource: unknown,
): resource is TechnicalResourcePageDto {
  if (!isRecord(resource)) return false
  const value = resource as unknown as Partial<TechnicalResourcePageDto>
  const identity = value.identity
  const seo = value.seo
  const hero = value.hero
  const structurallyComplete = Boolean(
    identity &&
      safePlainText(identity.title) &&
      populated(identity.id) &&
      populated(identity.slug) &&
      safeCanonicalPath(identity.path) &&
      safePlainText(identity.cluster) &&
      populated(identity.modified) &&
      seo &&
      safePlainText(seo.title) &&
      safePlainText(seo.description) &&
      hero &&
      safePlainText(hero.eyebrow) &&
      safePlainText(hero.headline) &&
      safeRichText(hero.directAnswer) &&
      safePlainStrings(value.keyTakeaways) &&
      completeSections(value.sections) &&
      completeComparisonTable(value.comparisonTable) &&
      safePlainStrings(value.practicalImplications) &&
      safePlainStrings(value.commonMistakes) &&
      safePlainStrings(value.evaluationMethod) &&
      completeFaqs(value.faqs) &&
      completeLinks(value.children) &&
      completeLinks(value.relationships) &&
      completeCtas(value.ctas) &&
      safeRichText(value.disclaimerHtml),
  )
  if (!structurallyComplete) return false
  const complete = value as TechnicalResourcePageDto
  return (
    hasCanonicalIdentity(complete) &&
    hasCanonicalChildren(complete) &&
    matchesAuthoritativeContract(complete)
  )
}

export function TechnicalResourcePageRenderer({
  resource,
}: TechnicalResourcePageRendererProps) {
  if (!isCompleteResource(resource)) return null
  const Renderer = RESOURCE_RENDERERS[resource.identity.kind]
  return Renderer ? <Renderer resource={resource} /> : null
}
