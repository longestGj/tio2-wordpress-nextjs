import type {ZodIssue} from 'zod'

import {hasEditorialRichTextContent, normalizeEditorialInternalPath, sanitizeEditorialRichText} from '@/lib/editorial/rich-text'
import {resolveEditorialTargets} from '@/lib/editorial/relationships'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {technicalResourcePageInputSchema, type TechnicalResourcePageInput} from './schema'
import type {TechnicalResourcePageDto} from './types'

export class ResourceContractError extends Error {
  readonly issues: readonly string[]
  constructor(issues: readonly string[]) { super(`Invalid Resource render contract: ${issues.join(', ')}`); this.name = 'ResourceContractError'; this.issues = [...new Set(issues)] }
}
const issuePath = (issue: ZodIssue) => issue.path.map(String).join('.') || 'resource'
const rich = (value: string, issue: string) => { const sanitized = sanitizeEditorialRichText(value); if (!hasEditorialRichTextContent(sanitized)) throw new ResourceContractError([issue]); return sanitized }
const path = (value: string) => { const normalized = normalizeEditorialInternalPath(value); if (!normalized) throw new ResourceContractError(['path']); return normalized }
const normalize = (page: TechnicalResourcePageInput, resolveTarget: EditorialLinkResolver): TechnicalResourcePageDto => ({
  identity: {...page.identity, path: path(page.identity.path), modified: new Date(`${page.identity.modified.replace(/Z$/u, '')}Z`).toISOString()}, seo: {...page.seo}, hero: {...page.hero, directAnswer: rich(page.hero.directAnswer, 'hero.directAnswer')}, keyTakeaways: [...page.keyTakeaways], sections: page.sections.map((section, index) => ({...section, html: rich(section.html, `sections.${index}.html`)})), comparisonTable: page.comparisonTable ? {columns: [...page.comparisonTable.columns], rows: page.comparisonTable.rows.map((row) => [...row])} : null, practicalImplications: [...page.practicalImplications], commonMistakes: [...page.commonMistakes], evaluationMethod: [...page.evaluationMethod], faqs: page.faqs.map((faq, index) => ({...faq, answerHtml: rich(faq.answerHtml, `faqs.${index}.answerHtml`)})), children: resolveEditorialTargets(page.children, resolveTarget, 'children'), relationships: resolveEditorialTargets(page.relationships, resolveTarget, 'relationships'), ctas: page.ctas.map((cta) => ({...cta, href: path(cta.href)})), disclaimerHtml: rich(page.disclaimerHtml, 'disclaimerHtml'),
})
export function toTechnicalResourcePageDto(input: unknown, resolveTarget: EditorialLinkResolver): TechnicalResourcePageDto { const parsed = technicalResourcePageInputSchema.safeParse(input); if (!parsed.success) throw new ResourceContractError(parsed.error.issues.map(issuePath)); try { return normalize(parsed.data, resolveTarget) } catch (error) { if (error instanceof ResourceContractError) throw error; throw new ResourceContractError(['relationships']) } }
