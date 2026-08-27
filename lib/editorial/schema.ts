import {z} from 'zod'

import {containsForbiddenEditorialClaim, containsPrivateEditorialLocation, normalizeEditorialInternalPath} from './rich-text'

export const requiredEditorialText = (maximum = 2_000) => z.string().trim().min(1).max(maximum)
export const requiredEditorialHtml = z.string().trim().min(1).max(20_000)
export const editorialTimestamp = z.string().trim().refine((value) => {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.\d{3})?(Z)?$/u.exec(value)
  if (!match) return false
  const parsed = new Date(match[2] ? value : `${value}Z`)
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 19) === match[1]
}, 'Expected a valid WordPress GMT timestamp')
export const editorialId = z.string().trim().regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u)
export const editorialInternalPath = z.string().trim().refine((value) => normalizeEditorialInternalPath(value) !== null, 'Expected a canonical internal path')
export const editorialTargetSchema = z.discriminatedUnion('type', [
  z.object({type: z.literal('product'), id: requiredEditorialText(80)}).strict(),
  z.object({type: z.literal('application'), id: editorialId}).strict(),
  z.object({type: z.literal('resource'), id: editorialId}).strict(),
])
export const editorialLinkCtaSchema = z.object({
  kind: z.enum(['request-tds', 'discuss-application', 'request-sample']),
  label: requiredEditorialText(80),
  href: editorialInternalPath,
}).strict()

const FORBIDDEN_KEY_PATTERN = /(?:tds(?:url|file|path)?|manufacturer|legal(?:entity)?|reviewer|source(?:file|path)?|approval|price|stock|availability)/iu
export function addEditorialSafetyIssues(value: unknown, context: z.RefinementCtx, path: PropertyKey[] = []): void {
  if (typeof value === 'string') {
    if (containsPrivateEditorialLocation(value)) context.addIssue({code: 'custom', message: 'Editorial content must not contain a private document location', path})
    if (containsForbiddenEditorialClaim(value)) context.addIssue({code: 'custom', message: 'Editorial content contains a forbidden private or commercial claim', path})
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => addEditorialSafetyIssues(item, context, [...path, index]))
    return
  }
  if (!value || typeof value !== 'object') return
  Object.entries(value).forEach(([key, item]) => {
    if (FORBIDDEN_KEY_PATTERN.test(key)) context.addIssue({code: 'custom', message: 'Editorial content contains a forbidden field', path: [...path, key]})
    addEditorialSafetyIssues(item, context, [...path, key])
  })
}
