import {z} from 'zod'

import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import {technicalResourcePageInputSchema, type TechnicalResourcePageInput} from './schema'

export const SITE_A_RESOURCE_IDENTITIES = [
  ['resources-hub', 'resources', '/resources', 'hub', 'Hub'],
  ['article-01', 'rutile-vs-anatase-titanium-dioxide', '/resources/rutile-vs-anatase-titanium-dioxide', 'article', 'TiO₂ Fundamentals'],
  ['article-02', 'chloride-vs-sulfate-titanium-dioxide', '/resources/chloride-vs-sulfate-titanium-dioxide', 'article', 'TiO₂ Fundamentals'],
  ['article-03', 'tio2-content-vs-performance', '/resources/tio2-content-vs-performance', 'article', 'TiO₂ Fundamentals'],
  ['article-04', 'titanium-dioxide-oil-absorption', '/resources/titanium-dioxide-oil-absorption', 'article', 'Performance'],
  ['article-05', 'cbu-titanium-dioxide-meaning', '/resources/cbu-titanium-dioxide-meaning', 'article', 'Performance'],
  ['article-06', 'titanium-dioxide-surface-treatment', '/resources/titanium-dioxide-surface-treatment', 'article', 'Performance'],
  ['article-07', 'evaluate-titanium-dioxide-alternative', '/resources/evaluate-titanium-dioxide-alternative', 'article', 'Grade Replacement'],
  ['article-08', 'reduce-tio2-cost-high-pvc-paint', '/resources/reduce-tio2-cost-high-pvc-paint', 'article', 'Application Testing'],
  ['article-09', 'titanium-dioxide-polycarbonate-yellowing', '/resources/titanium-dioxide-polycarbonate-yellowing', 'article', 'Application Testing'],
  ['article-10', 'titanium-dioxide-outdoor-durability', '/resources/titanium-dioxide-outdoor-durability', 'article', 'Application Testing'],
] as const

export type SiteAResourceIdentity =
  (typeof SITE_A_RESOURCE_IDENTITIES)[number]
export type SiteAResourceId = SiteAResourceIdentity[0]

export interface SiteAResourceContentManifest {
  version: '0.1'
  siteId: 'tio2-a'
  records: TechnicalResourcePageInput[]
}

export interface ManifestValidationOptions {
  allowIncomplete?: boolean
}

const identities: Map<string, {slug: string; path: string; kind: string; cluster: string}> = new Map(SITE_A_RESOURCE_IDENTITIES.map(([id, slug, path, kind, cluster]) => [id, {slug, path, kind, cluster}]))
const expectedArticleIds = SITE_A_RESOURCE_IDENTITIES.slice(1).map(([id]): string => id)

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return actualSet.size === actual.length && expectedSet.size === expected.length && actualSet.size === expectedSet.size && [...actualSet].every((value) => expectedSet.has(value))
}

const batchSchema: z.ZodType<SiteAResourceContentManifest> = z.object({
  version: z.literal('0.1'),
  siteId: z.literal('tio2-a'),
  records: z.array(technicalResourcePageInputSchema).max(SITE_A_RESOURCE_IDENTITIES.length),
}).strict().superRefine((manifest, context) => {
  const seen = new Set<string>()
  manifest.records.forEach((record, index) => {
    const {id, slug, kind, cluster} = record.identity
    const canonical = identities.get(id)
    if (seen.has(id)) context.addIssue({code: 'custom', message: `Duplicate Resource ID: ${id}`, path: ['records', index, 'identity', 'id']})
    seen.add(id)
    if (!canonical) {
      context.addIssue({code: 'custom', message: `Unknown Resource ID: ${id}`, path: ['records', index, 'identity', 'id']})
      return
    }
    if (slug !== canonical.slug) context.addIssue({code: 'custom', message: 'Resource identity must use the canonical slug', path: ['records', index, 'identity', 'slug']})
    if (normalizeEditorialInternalPath(record.identity.path) !== canonical.path) context.addIssue({code: 'custom', message: 'Resource identity must use the canonical path', path: ['records', index, 'identity', 'path']})
    if (kind !== canonical.kind || cluster !== canonical.cluster) context.addIssue({code: 'custom', message: 'Resource identity must use the canonical kind and cluster', path: ['records', index, 'identity']})

    const expectedChildren = id === 'resources-hub' ? expectedArticleIds : []
    const actualChildren = record.children.filter(({type}) => type === 'resource').map(({id: childId}) => childId)
    if (record.children.some(({type}) => type !== 'resource') || !sameMembers(actualChildren, expectedChildren)) context.addIssue({code: 'custom', message: 'Resource children must model the canonical Hub-to-Article hierarchy', path: ['records', index, 'children']})
  })
})

export const siteAResourceManifestSchema: z.ZodType<SiteAResourceContentManifest> = batchSchema.superRefine((manifest, context) => {
  if (manifest.records.length !== SITE_A_RESOURCE_IDENTITIES.length) context.addIssue({code: 'custom', message: 'A complete Resource manifest must contain exactly 11 records', path: ['records']})
  const actual = new Set(manifest.records.map(({identity}) => identity.id))
  SITE_A_RESOURCE_IDENTITIES.forEach(([id]) => {
    if (!actual.has(id)) context.addIssue({code: 'custom', message: `Missing canonical Resource ID: ${id}`, path: ['records']})
  })
})

export function validateSiteAResourceManifest(input: unknown, options: ManifestValidationOptions = {}): SiteAResourceContentManifest {
  return (options.allowIncomplete ? batchSchema : siteAResourceManifestSchema).parse(input)
}
