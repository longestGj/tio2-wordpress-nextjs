import type {ZodIssue} from 'zod'

import {hasEditorialRichTextContent, normalizeEditorialInternalPath, sanitizeEditorialRichText} from '@/lib/editorial/rich-text'
import {resolveEditorialTargets} from '@/lib/editorial/relationships'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {applicationPageInputSchema, type ApplicationPageInput} from './schema'
import type {ApplicationPageDto} from './types'

export class ApplicationContractError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) { super(`Invalid Application render contract: ${issues.join(', ')}`); this.name = 'ApplicationContractError'; this.issues = [...new Set(issues)] }
}
const issuePath = (issue: ZodIssue) => issue.path.map(String).join('.') || 'application'
const rich = (value: string, path: string) => { const sanitized = sanitizeEditorialRichText(value); if (!hasEditorialRichTextContent(sanitized)) throw new ApplicationContractError([path]); return sanitized }
const path = (value: string) => { const normalized = normalizeEditorialInternalPath(value); if (!normalized) throw new ApplicationContractError(['path']); return normalized }
const baseNormalize = (page: ApplicationPageInput, resolveTarget: EditorialLinkResolver): Omit<ApplicationPageDto, 'startingProducts'> => ({
  identity: {...page.identity, path: path(page.identity.path), modified: new Date(`${page.identity.modified.replace(/Z$/u, '')}Z`).toISOString()}, seo: {...page.seo}, hero: {...page.hero, directAnswer: rich(page.hero.directAnswer, 'hero.directAnswer')}, decisionGuide: {...page.decisionGuide, selectionFactors: [...page.decisionGuide.selectionFactors], validationPlan: [...page.decisionGuide.validationPlan], customerInputs: [...page.decisionGuide.customerInputs]}, bodySections: page.bodySections.map((section, index) => ({...section, html: rich(section.html, `bodySections.${index}.html`)})), faqs: page.faqs.map((faq, index) => ({...faq, answerHtml: rich(faq.answerHtml, `faqs.${index}.answerHtml`)})), children: resolveEditorialTargets(page.children, resolveTarget, 'children'), relationships: resolveEditorialTargets(page.relationships, resolveTarget, 'relationships'), ctas: page.ctas.map((cta) => ({...cta, href: path(cta.href)})), disclaimerHtml: rich(page.disclaimerHtml, 'disclaimerHtml'),
})

const normalize = (
  page: ApplicationPageInput,
  resolveTarget: EditorialLinkResolver,
): ApplicationPageDto => {
  const startingProducts = page.startingProducts.map((item, index) => {
    const product = resolveTarget({type: 'product', id: item.productId})
    if (!product || product.type !== 'product' || product.id !== item.productId) {
      throw new ApplicationContractError([
        'startingProducts.' + index + '.productId',
      ])
    }
    return {
      product,
      role: item.role,
      label: item.label,
      summaryHtml: rich(
        item.summaryHtml,
        'startingProducts.' + index + '.summaryHtml',
      ),
    }
  })
  return {...baseNormalize(page, resolveTarget), startingProducts}
}

export function toApplicationPageDto(input: unknown, resolveTarget: EditorialLinkResolver): ApplicationPageDto { const parsed = applicationPageInputSchema.safeParse(input); if (!parsed.success) throw new ApplicationContractError(parsed.error.issues.map(issuePath)); try { return normalize(parsed.data, resolveTarget) } catch (error) { if (error instanceof ApplicationContractError) throw error; throw new ApplicationContractError(['relationships']) } }
