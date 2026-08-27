import {readFile} from 'node:fs/promises'

import {describe, expect, it} from 'vitest'

import {validateSiteAEditorialGraph} from '@/lib/editorial/content-graph'

const clone = <T>(value: T): T => structuredClone(value)

async function productsManifest() {
  return JSON.parse(await readFile('D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json', 'utf8'))
}

function applicationsManifest() {
  return {version: '0.1', siteId: 'tio2-a', records: [{
    identity: {id: 'applications-hub', title: 'Synthetic Applications Hub', slug: 'applications', path: '/applications', level: 'hub', family: 'All', parentId: null, modified: '2026-08-27T08:00:00'},
    seo: {title: 'Synthetic applications', description: 'Synthetic, brand-neutral evaluation guidance for fictional material applications.'}, hero: {eyebrow: 'Synthetic guidance', headline: 'Compare fictional conditions systematically.', directAnswer: '<p>Use representative fictional trials.</p>'},
    decisionGuide: {context: 'Synthetic context.', buyerProblem: 'Synthetic problem.', selectionFactors: ['A', 'B', 'C'], powderDataLimits: 'Synthetic data limits.', validationPlan: ['Run a trial.'], customerInputs: ['Share context.']}, bodySections: [{id: 'one', heading: 'One', html: '<p>One.</p>'}, {id: 'two', heading: 'Two', html: '<p>Two.</p>'}], faqs: Array.from({length: 4}, (_, index) => ({question: `Question ${index}?`, answerHtml: '<p>Synthetic answer.</p>'})), children: [], relationships: [], ctas: [{kind: 'discuss-application', label: 'Discuss synthetic context', href: '/contact'}], disclaimerHtml: '<p>Technical data is available by request.</p>',
  }]}
}

function resourcesManifest() {
  return {version: '0.1', siteId: 'tio2-a', records: [{
    identity: {id: 'resources-hub', title: 'Synthetic Resources Hub', slug: 'resources', path: '/resources', kind: 'hub', cluster: 'Hub', modified: '2026-08-27T08:00:00'}, seo: {title: 'Synthetic resources', description: 'Synthetic, brand-neutral technical guidance for fictional materials.'}, hero: {eyebrow: 'Synthetic technical guidance', headline: 'Compare fictional observations carefully.', directAnswer: '<p>Use representative fictional trials.</p>'}, keyTakeaways: ['A', 'B', 'C'], sections: [{id: 'one', heading: 'One', html: '<p>One.</p>'}, {id: 'two', heading: 'Two', html: '<p>Two.</p>'}], comparisonTable: null, practicalImplications: ['A'], commonMistakes: ['A'], evaluationMethod: ['A'], faqs: Array.from({length: 4}, (_, index) => ({question: `Question ${index}?`, answerHtml: '<p>Synthetic answer.</p>'})), children: [], relationships: [], ctas: [{kind: 'discuss-application', label: 'Discuss synthetic context', href: '/contact'}], disclaimerHtml: '<p>Technical data is available by request.</p>',
  }]}
}

describe('Site A cross-content graph validator', () => {
  it('reports every unresolved Application, Resource, and Product edge with its source and field path', async () => {
    const applications = applicationsManifest() as any
    const resources = resourcesManifest() as any
    const products = await productsManifest()
    applications.records[0].relationships = [{type: 'resource', id: 'missing-resource'}]
    resources.records[0].relationships = [{type: 'application', id: 'missing-application'}]
    products.products[0].relatedLinks.products = [{targetType: 'product', targetKey: 'TP-X999'}]

    expect(validateSiteAEditorialGraph({applications, resources, products})).toEqual(expect.arrayContaining([
      {sourceId: 'applications-hub', fieldPath: 'relationships.0', targetType: 'resource', targetId: 'missing-resource'},
      {sourceId: 'resources-hub', fieldPath: 'relationships.0', targetType: 'application', targetId: 'missing-application'},
      {sourceId: products.products[0].productId, fieldPath: 'relatedLinks.products.0', targetType: 'product', targetId: 'TP-X999'},
    ]))
  })

  it('does not mutate its inputs while examining Product targetType/targetKey declarations', async () => {
    const applications = applicationsManifest()
    const resources = resourcesManifest()
    const products = await productsManifest()
    const before = clone({applications, resources, products})

    validateSiteAEditorialGraph({applications, resources, products})

    expect({applications, resources, products}).toEqual(before)
  })
})
