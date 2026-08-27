import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {execFile} from 'node:child_process'
import {tmpdir} from 'node:os'
import {join} from 'node:path'

import {describe, expect, it} from 'vitest'

import {validateSiteAEditorialGraph} from '@/lib/editorial/content-graph'
import {mutableFixture} from '@/tests/fixtures/editorial/mutable-fixture'

const clone = <T>(value: T): T => structuredClone(value)

function runGraphCli(args: string[]): Promise<{code: number, stdout: string, stderr: string}> {
  return new Promise((resolve) => execFile(process.execPath, ['scripts/editorial/validate-site-a-content-graph.mjs', ...args], {cwd: process.cwd()}, (error, stdout, stderr) => resolve({code: error && 'code' in error && typeof error.code === 'number' ? error.code : 0, stdout, stderr})))
}

async function productsManifest() {
  return JSON.parse(await readFile('D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json', 'utf8'))
}

function applicationsManifest() {
  return {version: '0.1', siteId: 'tio2-a', records: [{
    identity: {id: 'applications-hub', title: 'Synthetic Applications Hub', slug: 'applications', path: '/applications', level: 'hub', family: 'All', parentId: null, modified: '2026-08-27T08:00:00'},
    seo: {title: 'Synthetic applications', description: 'Synthetic, brand-neutral evaluation guidance for fictional material applications.'}, hero: {eyebrow: 'Synthetic guidance', headline: 'Compare fictional conditions systematically.', directAnswer: '<p>Use representative fictional trials.</p>'},
    decisionGuide: {context: 'Synthetic context.', buyerProblem: 'Synthetic problem.', selectionFactors: ['A', 'B', 'C'], powderDataLimits: 'Synthetic data limits.', validationPlan: ['Run a trial.'], customerInputs: ['Share context.']}, bodySections: [{id: 'one', heading: 'One', html: '<p>One.</p>'}, {id: 'two', heading: 'Two', html: '<p>Two.</p>'}], faqs: Array.from({length: 4}, (_, index) => ({question: `Question ${index}?`, answerHtml: '<p>Synthetic answer.</p>'})), children: [] as Array<{id: string; type: string}>, relationships: [] as Array<{id: string; type: string}>, ctas: [{kind: 'discuss-application', label: 'Discuss synthetic context', href: '/contact'}], disclaimerHtml: '<p>Technical data is available by request.</p>',
  }]}
}

function resourcesManifest() {
  return {version: '0.1', siteId: 'tio2-a', records: [{
    identity: {id: 'resources-hub', title: 'Synthetic Resources Hub', slug: 'resources', path: '/resources', kind: 'hub', cluster: 'Hub', modified: '2026-08-27T08:00:00'}, seo: {title: 'Synthetic resources', description: 'Synthetic, brand-neutral technical guidance for fictional materials.'}, hero: {eyebrow: 'Synthetic technical guidance', headline: 'Compare fictional observations carefully.', directAnswer: '<p>Use representative fictional trials.</p>'}, keyTakeaways: ['A', 'B', 'C'], sections: [{id: 'one', heading: 'One', html: '<p>One.</p>'}, {id: 'two', heading: 'Two', html: '<p>Two.</p>'}], comparisonTable: null, practicalImplications: ['A'], commonMistakes: ['A'], evaluationMethod: ['A'], faqs: Array.from({length: 4}, (_, index) => ({question: `Question ${index}?`, answerHtml: '<p>Synthetic answer.</p>'})), children: [], relationships: [], ctas: [{kind: 'discuss-application', label: 'Discuss synthetic context', href: '/contact'}], disclaimerHtml: '<p>Technical data is available by request.</p>',
  }]}
}

describe('Site A cross-content graph validator', () => {
  it('accepts one incomplete flag and rejects duplicate, unknown, and strict partial CLI invocations', async () => {
    const args = ['--applications', 'D:/11SEO/01ComInfo/outputs/site-a-applications-v0.1.json', '--resources', 'D:/11SEO/01ComInfo/outputs/site-a-resources-v0.1.json', '--products', 'D:/11SEO/01ComInfo/outputs/site-a-products-v0.1.json']
    await expect(runGraphCli([...args, '--allow-incomplete'])).resolves.toMatchObject({code: 0, stdout: '{"unresolvedEdges":[]}\n'})
    await expect(runGraphCli([...args, '--allow-incomplete', '--allow-incomplete'])).resolves.toMatchObject({code: 1, stderr: expect.stringContaining('Usage:')})
    await expect(runGraphCli([...args, '--unknown'])).resolves.toMatchObject({code: 1, stderr: expect.stringContaining('Usage:')})
    const fixtureDirectory = await mkdtemp(join(tmpdir(), 'site-a-content-graph-'))
    try {
      const partialResourcesPath = join(fixtureDirectory, 'partial-resources.json')
      const resources = JSON.parse(await readFile(args[3], 'utf8'))
      resources.records = resources.records.slice(0, 6)
      await writeFile(partialResourcesPath, JSON.stringify(resources), 'utf8')
      const strictPartialArgs = [...args]
      strictPartialArgs[3] = partialResourcesPath
      await expect(runGraphCli(strictPartialArgs)).resolves.toMatchObject({code: 1, stderr: expect.stringContaining('exactly 11')})
    } finally {
      await rm(fixtureDirectory, {recursive: true, force: true})
    }
  })

  it('accepts canonical future Application and Resource targets only in incomplete mode', async () => {
    const applications = applicationsManifest()
    const resources = resourcesManifest()
    const products = await productsManifest()
    products.products = []
    applications.records[0].relationships = [
      {type: 'application', id: 'coatings'},
      {type: 'resource', id: 'article-01'},
      {type: 'application', id: 'missing-application'},
      {type: 'resource', id: 'missing-resource'},
      {type: 'product', id: 'TP-X999'},
    ]

    expect(validateSiteAEditorialGraph({applications, resources, products})).toEqual(expect.arrayContaining([
      {sourceId: 'applications-hub', fieldPath: 'relationships.0', targetType: 'application', targetId: 'coatings'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.1', targetType: 'resource', targetId: 'article-01'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.2', targetType: 'application', targetId: 'missing-application'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.3', targetType: 'resource', targetId: 'missing-resource'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.4', targetType: 'product', targetId: 'TP-X999'},
    ]))
    expect(validateSiteAEditorialGraph({applications, resources, products}, {allowIncomplete: true})).toEqual([
      {sourceId: 'applications-hub', fieldPath: 'relationships.2', targetType: 'application', targetId: 'missing-application'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.3', targetType: 'resource', targetId: 'missing-resource'},
      {sourceId: 'applications-hub', fieldPath: 'relationships.4', targetType: 'product', targetId: 'TP-X999'},
    ])
  })

  it('reports an exact result for every supported cross-content edge group', async () => {
    const applications = mutableFixture(applicationsManifest()) as unknown as {
      records: Array<{
        children: Array<{id: string; type: string}>
        relationships: Array<{id: string; type: string}>
      }>
    }
    const resources = mutableFixture(resourcesManifest()) as unknown as {
      records: Array<{
        children: Array<{id: string; type: string}>
        relationships: Array<{id: string; type: string}>
      }>
    }
    const products = await productsManifest()
    products.products = [products.products[0]]
    applications.records[0].children = [{type: 'application', id: 'missing-application-child'}]
    applications.records[0].relationships = [{type: 'resource', id: 'missing-application-resource'}]
    resources.records[0].children = [{type: 'resource', id: 'missing-resource-child'}]
    resources.records[0].relationships = [{type: 'application', id: 'missing-resource-application'}]
    products.products[0].recommendedApplications = [
      {targetType: 'application', targetKey: 'missing-recommended-application'},
    ]
    products.products[0].relatedLinks = {
      applications: [{targetType: 'application', targetKey: 'missing-related-application'}],
      resources: [{targetType: 'resource', targetKey: 'missing-related-resource'}],
      products: [{targetType: 'product', targetKey: 'missing-related-product'}],
    }

    expect(validateSiteAEditorialGraph({applications, resources, products})).toEqual([
      {
        sourceId: 'applications-hub',
        fieldPath: 'children.0',
        targetType: 'application',
        targetId: 'missing-application-child',
      },
      {
        sourceId: 'applications-hub',
        fieldPath: 'relationships.0',
        targetType: 'resource',
        targetId: 'missing-application-resource',
      },
      {
        sourceId: 'resources-hub',
        fieldPath: 'children.0',
        targetType: 'resource',
        targetId: 'missing-resource-child',
      },
      {
        sourceId: 'resources-hub',
        fieldPath: 'relationships.0',
        targetType: 'application',
        targetId: 'missing-resource-application',
      },
      {
        sourceId: 'TP-P100',
        fieldPath: 'recommendedApplications.0',
        targetType: 'application',
        targetId: 'missing-recommended-application',
      },
      {
        sourceId: 'TP-P100',
        fieldPath: 'relatedLinks.applications.0',
        targetType: 'application',
        targetId: 'missing-related-application',
      },
      {
        sourceId: 'TP-P100',
        fieldPath: 'relatedLinks.products.0',
        targetType: 'product',
        targetId: 'missing-related-product',
      },
      {
        sourceId: 'TP-P100',
        fieldPath: 'relatedLinks.resources.0',
        targetType: 'resource',
        targetId: 'missing-related-resource',
      },
    ])
  })

  it('reports every unresolved Application, Resource, and Product edge with its source and field path', async () => {
    const applications = mutableFixture(applicationsManifest()) as unknown as {
      records: Array<{relationships: Array<{id: string; type: string}>}>
    }
    const resources = mutableFixture(resourcesManifest()) as unknown as {
      records: Array<{relationships: Array<{id: string; type: string}>}>
    }
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
