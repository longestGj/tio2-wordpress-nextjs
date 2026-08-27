import {describe, expect, it} from 'vitest'

import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'
import {applicationPageInputSchema} from '@/lib/applications/schema'
import {validateSiteAResourceManifest} from '@/lib/resources/content-manifest'
import {applicationHubInput} from '@/tests/fixtures/editorial/application-pages'
import {resourceHubInput} from '@/tests/fixtures/editorial/resource-pages'
import {mutableFixture} from '@/tests/fixtures/editorial/mutable-fixture'

const clone = <T>(value: T): T => structuredClone(value)

const APPLICATIONS = [
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

const RESOURCES = [
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

function applicationsManifest() {
  const records = APPLICATIONS.map(([id, slug, path, level, family, parentId]) => ({
    ...clone(applicationHubInput),
    identity: {...applicationHubInput.identity, id, title: `Synthetic ${id}`, slug, path, level, family, parentId},
    children: APPLICATIONS.filter((entry) => entry[5] === id).map(([childId]) => ({type: 'application' as const, id: childId})),
    relationships: [{type: 'resource' as const, id: 'article-01'}, {type: 'product' as const, id: 'TP-P100'}, ...(id === 'universal-multi-application' ? ['coatings', 'plastics', 'printing-inks'].map((targetId) => ({type: 'application' as const, id: targetId})) : [])],
  }))
  return {version: '0.1', siteId: 'tio2-a', records}
}

function resourcesManifest() {
  const records = RESOURCES.map(([id, slug, path, kind, cluster]) => ({
    ...clone(resourceHubInput),
    identity: {...resourceHubInput.identity, id, title: `Synthetic ${id}`, slug, path, kind, cluster},
    children: id === 'resources-hub' ? RESOURCES.slice(1).map(([articleId]) => ({type: 'resource' as const, id: articleId})) : [],
    relationships: [{type: 'application' as const, id: 'coatings'}, {type: 'product' as const, id: 'TP-P100'}],
  }))
  return {version: '0.1', siteId: 'tio2-a', records}
}

describe('exact Site A editorial manifest validators', () => {
  it('accepts the exact mandatory disclaimer while rejecting a guaranteed result claim', () => {
    const exactDisclaimer = '<p>Product information is provided for technical evaluation and product selection purposes. Typical values are not intended as guaranteed specifications unless explicitly stated in an agreed commercial specification or certificate of analysis. Performance may vary with formulation, processing conditions and end-use requirements. Customers should evaluate the product in their own application before commercial adoption.</p>'
    expect(applicationPageInputSchema.parse({...applicationHubInput, disclaimerHtml: exactDisclaimer}).disclaimerHtml).toBe(exactDisclaimer)
    expect(() => applicationPageInputSchema.parse({...applicationHubInput, disclaimerHtml: '<p>A guaranteed result.</p>'})).toThrow(/forbidden/u)
  })

  it('preserves a ten-item approved customer-input list', () => {
    const customerInputs = [
      'Resin type, grade and recycled-content level, if applicable',
      'Application and finished-part format',
      'Current pigment or matched control',
      'Pigment loading, masterbatch concentration and let-down ratio',
      'Extrusion, compounding or molding temperature profile and residence time',
      'Key additives, including stabilizers, fillers and flame-retardant packages',
      'Color, opacity, whiteness, reflectance or undertone target',
      'Film thickness, surface-quality requirement or part geometry where relevant',
      'Required weathering, UV, yellowing, mechanical or process-performance checks',
      'Destination-market requirements that affect the evaluation plan',
    ]
    expect(applicationPageInputSchema.parse({...applicationHubInput, decisionGuide: {...applicationHubInput.decisionGuide, customerInputs}}).decisionGuide.customerInputs).toEqual(customerInputs)
  })

  it('accepts the complete approved Application and Resource inventories', () => {
    expect(validateSiteAApplicationManifest(applicationsManifest()).records).toHaveLength(28)
    expect(validateSiteAResourceManifest(resourcesManifest()).records).toHaveLength(11)
  })

  it('rejects missing, extra, and duplicate Application IDs in strict mode', () => {
    const missing = applicationsManifest()
    missing.records.pop()
    expect(() => validateSiteAApplicationManifest(missing)).toThrow(/exactly 28|Missing canonical Application ID/u)

    const extra = mutableFixture(applicationsManifest())
    extra.records.push(clone(extra.records[0]))
    const appended = extra.records.at(-1)
    expect(appended).toBeDefined()
    if (!appended) throw new Error('Expected the appended Application fixture')
    appended.identity.id = 'unknown-application'
    expect(() => validateSiteAApplicationManifest(extra)).toThrow(/Unknown Application ID/u)

    const duplicate = applicationsManifest()
    duplicate.records.push(clone(duplicate.records[0]))
    expect(() => validateSiteAApplicationManifest(duplicate)).toThrow(/Duplicate Application ID/u)
  })

  it('accepts valid cumulative canonical batches without weakening page, route, or hierarchy checks', () => {
    const batch = mutableFixture(applicationsManifest())
    batch.records = batch.records.filter(({identity}) => ['applications-hub', 'coatings', 'water-based-paint'].includes(identity.id))
    expect(validateSiteAApplicationManifest(batch, {allowIncomplete: true}).records.map(({identity}) => identity.id)).toEqual(['applications-hub', 'coatings', 'water-based-paint'])

    batch.records[2].identity.path = '/applications/not-water-based-paint'
    expect(() => validateSiteAApplicationManifest(batch, {allowIncomplete: true})).toThrow(/canonical path/u)
  })

  it('rejects invalid application hierarchy and the mandated universal relationships', () => {
    const invalidParent = applicationsManifest()
    invalidParent.records.find(({identity}) => identity.id === 'masterbatch')!.identity.parentId = 'coatings'
    expect(() => validateSiteAApplicationManifest(invalidParent)).toThrow(/canonical parent/u)

    const missingRelated = applicationsManifest()
    missingRelated.records.find(({identity}) => identity.id === 'universal-multi-application')!.relationships = [{type: 'application', id: 'coatings'}]
    expect(() => validateSiteAApplicationManifest(missingRelated)).toThrow(/must relate to coatings, plastics, and printing-inks/u)
  })

  it.each([undefined, {allowIncomplete: true}])('rejects an Application Hub duplicate child that replaces a required canonical child in %j mode', (options) => {
    const manifest = applicationsManifest()
    const hub = manifest.records.find(({identity}) => identity.id === 'applications-hub')!
    const plasticsIndex = hub.children.findIndex(({id}) => id === 'plastics')
    hub.children[plasticsIndex] = {type: 'application', id: 'coatings'}

    expect(() => validateSiteAApplicationManifest(manifest, options)).toThrow(/canonical Hub-to-Category-to-Detail hierarchy/u)
  })

  it('rejects missing, extra, duplicate, invalid kind, and invalid route Resource records', () => {
    const missing = resourcesManifest()
    missing.records.pop()
    expect(() => validateSiteAResourceManifest(missing)).toThrow(/exactly 11|Missing canonical Resource ID/u)

    const extra = mutableFixture(resourcesManifest())
    extra.records.push(clone(extra.records[0]))
    const appended = extra.records.at(-1)
    expect(appended).toBeDefined()
    if (!appended) throw new Error('Expected the appended Resource fixture')
    appended.identity.id = 'article-99'
    expect(() => validateSiteAResourceManifest(extra)).toThrow(/Unknown Resource ID/u)

    const duplicate = resourcesManifest()
    duplicate.records.push(clone(duplicate.records[0]))
    expect(() => validateSiteAResourceManifest(duplicate)).toThrow(/Duplicate Resource ID/u)

    const kind = mutableFixture(resourcesManifest())
    kind.records[1].identity.kind = 'guide'
    expect(() => validateSiteAResourceManifest(kind)).toThrow(/canonical kind/u)

    const path = mutableFixture(resourcesManifest())
    path.records[1].identity.path = '/resources/not-article-01'
    expect(() => validateSiteAResourceManifest(path)).toThrow(/canonical path/u)
  })

  it('accepts a valid Resource batch only when allowIncomplete is set', () => {
    const batch = resourcesManifest()
    batch.records = batch.records.slice(0, 2)
    expect(() => validateSiteAResourceManifest(batch)).toThrow(/exactly 11/u)
    expect(validateSiteAResourceManifest(batch, {allowIncomplete: true}).records).toHaveLength(2)
  })

  it('accepts an empty Resource root only in incomplete mode', () => {
    const emptyRoot = {version: '0.1', siteId: 'tio2-a', records: []}
    expect(() => validateSiteAResourceManifest(emptyRoot)).toThrow(/exactly 11/u)
    expect(validateSiteAResourceManifest(emptyRoot, {allowIncomplete: true}).records).toHaveLength(0)
  })

  it.each([undefined, {allowIncomplete: true}])('rejects a Resource Hub duplicate child that replaces a required canonical child in %j mode', (options) => {
    const manifest = resourcesManifest()
    const hub = manifest.records.find(({identity}) => identity.id === 'resources-hub')!
    const articleIndex = hub.children.findIndex(({id}) => id === 'article-10')
    hub.children[articleIndex] = {type: 'resource', id: 'article-01'}

    expect(() => validateSiteAResourceManifest(manifest, options)).toThrow(/canonical Hub-to-Article hierarchy/u)
  })
})
