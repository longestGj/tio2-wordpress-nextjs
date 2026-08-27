import type {ApplicationPageDto} from '@/lib/applications/types'
import {applicationPageInputSchema} from '@/lib/applications/schema'
import {hasCanonicalApplicationGraph} from '@/lib/applications/runtime'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {
  containsForbiddenEditorialClaim,
  containsPrivateEditorialLocation,
  hasEditorialRichTextContent,
  normalizeEditorialInternalPath,
  sanitizeEditorialRichText,
} from '@/lib/editorial/rich-text'

import {ApplicationCategory} from './application-category'
import {ApplicationDetail} from './application-detail'
import {ApplicationHub} from './application-hub'

interface ApplicationPageRendererProps {
  readonly application: ApplicationPageDto
}

function populated(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function populatedArray(value: unknown): value is readonly unknown[] {
  return Array.isArray(value) && value.length > 0
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
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
        ['request-tds', 'discuss-application', 'request-sample'].includes(
          String(cta.kind),
        ) &&
        safePlainText(cta.label) &&
        safeCanonicalPath(cta.href),
    )
  )
}

function matchesAuthoritativeContract(application: ApplicationPageDto): boolean {
  return applicationPageInputSchema.safeParse({
    ...application,
    children: application.children.map(({type, id}) => ({type, id})),
    relationships: application.relationships.map(({type, id}) => ({type, id})),
  }).success
}

export function isValidatedApplicationPageDto(
  application: unknown,
): application is ApplicationPageDto {
  if (!application || typeof application !== 'object') return false
  const value = application as Partial<ApplicationPageDto>
  const identity = value.identity
  const seo = value.seo
  const hero = value.hero
  const guide = value.decisionGuide
  const structurallyComplete = Boolean(
    identity &&
      ['hub', 'category', 'detail'].includes(identity.level) &&
      populated(identity.id) &&
      safePlainText(identity.title) &&
      populated(identity.slug) &&
      safeCanonicalPath(identity.path) &&
      safePlainText(identity.family) &&
      populated(identity.modified) &&
      seo &&
      safePlainText(seo.title) &&
      safePlainText(seo.description) &&
      hero &&
      safePlainText(hero.eyebrow) &&
      safePlainText(hero.headline) &&
      safeRichText(hero.directAnswer) &&
      guide &&
      safePlainText(guide.context) &&
      safePlainText(guide.buyerProblem) &&
      safePlainStrings(guide.selectionFactors) &&
      safePlainText(guide.powderDataLimits) &&
      safePlainStrings(guide.validationPlan) &&
      safePlainStrings(guide.customerInputs) &&
      completeSections(value.bodySections) &&
      completeFaqs(value.faqs) &&
      completeLinks(value.children) &&
      completeLinks(value.relationships) &&
      completeCtas(value.ctas) &&
      safeRichText(value.disclaimerHtml),
  )
  return (
    structurallyComplete &&
    hasCanonicalApplicationGraph(value as ApplicationPageDto) &&
    matchesAuthoritativeContract(value as ApplicationPageDto)
  )
}

export function ApplicationPageRenderer({
  application,
}: ApplicationPageRendererProps) {
  if (!isValidatedApplicationPageDto(application)) return null

  switch (application.identity.level) {
    case 'hub':
      return <ApplicationHub application={application} />
    case 'category':
      return <ApplicationCategory application={application} />
    case 'detail':
      return <ApplicationDetail application={application} />
  }
}
