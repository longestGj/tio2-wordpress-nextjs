import {z} from 'zod'

import {normalizeEditorialInternalPath} from '@/lib/editorial/rich-text'
import {applicationPageInputSchema, type ApplicationPageInput} from './schema'

export const SITE_A_APPLICATION_IDENTITIES = [
  ['applications-hub', 'applications', '/applications', 'hub', 'All', null],
  ['coatings', 'coatings', '/applications/coatings', 'category', 'Coatings', 'applications-hub'],
  ['plastics', 'plastics', '/applications/plastics', 'category', 'Plastics', 'applications-hub'],
  ['printing-inks', 'printing-inks', '/applications/printing-inks', 'category', 'Printing Inks', 'applications-hub'],
  ['decorative-paper', 'decorative-paper', '/applications/decorative-paper', 'category', 'Decorative Paper', 'applications-hub'],
  ['solar-film', 'solar-film', '/applications/solar-film', 'category', 'Solar Film', 'applications-hub'],
  ['high-purity', 'high-purity', '/applications/high-purity', 'category', 'Functional', 'applications-hub'],
  ['water-based-paint', 'titanium-dioxide-for-water-based-paint', '/applications/titanium-dioxide-for-water-based-paint', 'detail', 'Coatings', 'coatings'],
  ['masterbatch', 'titanium-dioxide-for-masterbatch', '/applications/titanium-dioxide-for-masterbatch', 'detail', 'Plastics', 'plastics'],
  ['polycarbonate', 'titanium-dioxide-for-polycarbonate', '/applications/titanium-dioxide-for-polycarbonate', 'detail', 'Engineering Plastics', 'plastics'],
  ['printing-ink', 'titanium-dioxide-for-printing-ink', '/applications/titanium-dioxide-for-printing-ink', 'detail', 'Printing Inks', 'printing-inks'],
  ['photovoltaic-white-film', 'titanium-dioxide-for-photovoltaic-white-film', '/applications/titanium-dioxide-for-photovoltaic-white-film', 'detail', 'Solar Film', 'solar-film'],
  ['mlcc-electronic-ceramics', 'high-purity-titanium-dioxide-for-mlcc', '/applications/high-purity-titanium-dioxide-for-mlcc', 'detail', 'Functional', 'high-purity'],
  ['outdoor-pvc', 'titanium-dioxide-for-outdoor-pvc', '/applications/titanium-dioxide-for-outdoor-pvc', 'detail', 'Plastics', 'plastics'],
  ['film-masterbatch', 'titanium-dioxide-for-film-masterbatch', '/applications/titanium-dioxide-for-film-masterbatch', 'detail', 'Plastics', 'plastics'],
  ['soft-pvc-solar-backsheet', 'titanium-dioxide-for-soft-pvc-solar-backsheet', '/applications/titanium-dioxide-for-soft-pvc-solar-backsheet', 'detail', 'Plastics / Solar', 'plastics'],
  ['lcp-high-temperature-plastics', 'titanium-dioxide-for-lcp', '/applications/titanium-dioxide-for-lcp', 'detail', 'Engineering Plastics', 'plastics'],
  ['uv-resistant-engineering-plastics', 'uv-resistant-titanium-dioxide-engineering-plastics', '/applications/uv-resistant-titanium-dioxide-engineering-plastics', 'detail', 'Engineering Plastics', 'plastics'],
  ['decorative-paper-detail', 'titanium-dioxide-for-decorative-paper', '/applications/titanium-dioxide-for-decorative-paper', 'detail', 'Decorative Paper', 'decorative-paper'],
  ['laminated-decorative-paper', 'titanium-dioxide-for-laminated-decorative-paper', '/applications/titanium-dioxide-for-laminated-decorative-paper', 'detail', 'Decorative Paper', 'decorative-paper'],
  ['electrophoretic-coating', 'titanium-dioxide-for-electrophoretic-coating', '/applications/titanium-dioxide-for-electrophoretic-coating', 'detail', 'Coatings', 'coatings'],
  ['high-pvc-flat-paint', 'titanium-dioxide-for-high-pvc-paint', '/applications/titanium-dioxide-for-high-pvc-paint', 'detail', 'Coatings', 'coatings'],
  ['automotive-coatings', 'titanium-dioxide-for-automotive-coatings', '/applications/titanium-dioxide-for-automotive-coatings', 'detail', 'Coatings', 'coatings'],
  ['waterborne-automotive-coatings', 'titanium-dioxide-for-waterborne-automotive-coatings', '/applications/titanium-dioxide-for-waterborne-automotive-coatings', 'detail', 'Coatings', 'coatings'],
  ['marine-aerospace-protective', 'titanium-dioxide-for-protective-coatings', '/applications/titanium-dioxide-for-protective-coatings', 'detail', 'Coatings', 'coatings'],
  ['powder-coil-coatings', 'titanium-dioxide-for-powder-coil-coatings', '/applications/titanium-dioxide-for-powder-coil-coatings', 'detail', 'Coatings', 'coatings'],
  ['universal-multi-application', 'multi-purpose-titanium-dioxide', '/applications/multi-purpose-titanium-dioxide', 'detail', 'Cross-application', 'applications-hub'],
  ['functional-materials', 'high-purity-titanium-dioxide-functional-materials', '/applications/high-purity-titanium-dioxide-functional-materials', 'detail', 'Functional', 'high-purity'],
] as const

export interface SiteAApplicationContentManifest {
  version: '0.1'
  siteId: 'tio2-a'
  records: ApplicationPageInput[]
}

export interface ManifestValidationOptions {
  allowIncomplete?: boolean
}

const identities: Map<string, {slug: string; path: string; level: string; family: string; parentId: string|null}> = new Map(SITE_A_APPLICATION_IDENTITIES.map(([id, slug, path, level, family, parentId]) => [id, {slug, path, level, family, parentId}]))

function sameMembers(actual: readonly string[], expected: readonly string[]): boolean {
  return actual.length === expected.length && actual.every((value) => expected.includes(value))
}

const batchSchema: z.ZodType<SiteAApplicationContentManifest> = z.object({
  version: z.literal('0.1'),
  siteId: z.literal('tio2-a'),
  records: z.array(applicationPageInputSchema).min(1).max(SITE_A_APPLICATION_IDENTITIES.length),
}).strict().superRefine((manifest, context) => {
  const seen = new Set<string>()
  manifest.records.forEach((record, index) => {
    const {id, slug, level, family, parentId} = record.identity
    const canonical = identities.get(id)
    if (seen.has(id)) context.addIssue({code: 'custom', message: `Duplicate Application ID: ${id}`, path: ['records', index, 'identity', 'id']})
    seen.add(id)
    if (!canonical) {
      context.addIssue({code: 'custom', message: `Unknown Application ID: ${id}`, path: ['records', index, 'identity', 'id']})
      return
    }
    if (slug !== canonical.slug) context.addIssue({code: 'custom', message: 'Application identity must use the canonical slug', path: ['records', index, 'identity', 'slug']})
    if (normalizeEditorialInternalPath(record.identity.path) !== canonical.path) context.addIssue({code: 'custom', message: 'Application identity must use the canonical path', path: ['records', index, 'identity', 'path']})
    if (level !== canonical.level || family !== canonical.family) context.addIssue({code: 'custom', message: 'Application identity must use the canonical level and family', path: ['records', index, 'identity']})
    if (parentId !== canonical.parentId) context.addIssue({code: 'custom', message: 'Application identity must use the canonical parent', path: ['records', index, 'identity', 'parentId']})

    const expectedChildren = SITE_A_APPLICATION_IDENTITIES.filter((entry) => entry[5] === id).map(([childId]): string => childId)
    const actualChildren = record.children.filter(({type}) => type === 'application').map(({id: childId}) => childId)
    if (record.children.some(({type}) => type !== 'application') || !sameMembers(actualChildren, expectedChildren)) context.addIssue({code: 'custom', message: 'Application children must model the canonical Hub-to-Category-to-Detail hierarchy', path: ['records', index, 'children']})

    if (id === 'universal-multi-application') {
      const relatedApplications = record.relationships.filter(({type}) => type === 'application').map(({id: targetId}) => targetId)
      if (!['coatings', 'plastics', 'printing-inks'].every((targetId) => relatedApplications.includes(targetId))) context.addIssue({code: 'custom', message: 'universal-multi-application must relate to coatings, plastics, and printing-inks', path: ['records', index, 'relationships']})
    }
  })
})

export const siteAApplicationManifestSchema: z.ZodType<SiteAApplicationContentManifest> = batchSchema.superRefine((manifest, context) => {
  if (manifest.records.length !== SITE_A_APPLICATION_IDENTITIES.length) context.addIssue({code: 'custom', message: 'A complete Application manifest must contain exactly 28 records', path: ['records']})
  const actual = new Set(manifest.records.map(({identity}) => identity.id))
  SITE_A_APPLICATION_IDENTITIES.forEach(([id]) => {
    if (!actual.has(id)) context.addIssue({code: 'custom', message: `Missing canonical Application ID: ${id}`, path: ['records']})
  })
})

export function validateSiteAApplicationManifest(input: unknown, options: ManifestValidationOptions = {}): SiteAApplicationContentManifest {
  return (options.allowIncomplete ? batchSchema : siteAApplicationManifestSchema).parse(input)
}
