import type {ApplicationPageDto} from '@/lib/applications/types'
import {applicationPageInputSchema} from '@/lib/applications/schema'
import {
  containsForbiddenEditorialClaim,
  containsPrivateEditorialLocation,
  hasEditorialRichTextContent,
  normalizeEditorialInternalPath,
  sanitizeEditorialRichText,
} from '@/lib/editorial/rich-text'
import {htmlToPlainText} from '@/lib/seo/text'

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
  const plainText = htmlToPlainText(
    value,
    Math.max(Array.from(value).length, 1),
  )
  return (
    plainText === value &&
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
    value.every(
      (link) =>
        isRecord(link) &&
        ['product', 'application', 'resource'].includes(String(link.type)) &&
        populated(link.id) &&
        safePlainText(link.title) &&
        safeCanonicalPath(link.path) &&
        (link.href === null ||
          (safeCanonicalPath(link.href) && link.href === link.path)),
    )
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

function isCompleteApplication(application: unknown): application is ApplicationPageDto {
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
    matchesAuthoritativeContract(value as ApplicationPageDto)
  )
}

export function ApplicationPageRenderer({
  application,
}: ApplicationPageRendererProps) {
  if (!isCompleteApplication(application)) return null

  switch (application.identity.level) {
    case 'hub':
      return <ApplicationHub application={application} />
    case 'category':
      return <ApplicationCategory application={application} />
    case 'detail':
      return <ApplicationDetail application={application} />
  }
}
