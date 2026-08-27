import type {ApplicationPageDto} from '@/lib/applications/types'
import {applicationPageInputSchema} from '@/lib/applications/schema'

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function populatedStrings(value: unknown): value is readonly string[] {
  return populatedArray(value) && value.every(populated)
}

function completeSections(value: unknown): boolean {
  return (
    populatedArray(value) &&
    value.every(
      (section) =>
        isRecord(section) &&
        populated(section.id) &&
        populated(section.heading) &&
        populated(section.html),
    )
  )
}

function completeFaqs(value: unknown): boolean {
  return (
    populatedArray(value) &&
    value.every(
      (faq) =>
        isRecord(faq) &&
        populated(faq.question) &&
        populated(faq.answerHtml),
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
        populated(link.title) &&
        populated(link.path) &&
        (link.href === null || populated(link.href)),
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
        populated(cta.label) &&
        populated(cta.href),
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
      populated(identity.title) &&
      populated(identity.slug) &&
      populated(identity.path) &&
      populated(identity.family) &&
      populated(identity.modified) &&
      seo &&
      populated(seo.title) &&
      populated(seo.description) &&
      hero &&
      populated(hero.eyebrow) &&
      populated(hero.headline) &&
      populated(hero.directAnswer) &&
      guide &&
      populated(guide.context) &&
      populated(guide.buyerProblem) &&
      populatedStrings(guide.selectionFactors) &&
      populated(guide.powderDataLimits) &&
      populatedStrings(guide.validationPlan) &&
      populatedStrings(guide.customerInputs) &&
      completeSections(value.bodySections) &&
      completeFaqs(value.faqs) &&
      completeLinks(value.children) &&
      completeLinks(value.relationships) &&
      completeCtas(value.ctas) &&
      populated(value.disclaimerHtml),
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
