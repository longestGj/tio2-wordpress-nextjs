import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawnSync} from 'node:child_process'

import {afterEach, describe, expect, it} from 'vitest'

const EXPECTED_PRODUCT_IDS = [
  'TP-P100', 'TP-P300', 'TP-S100', 'TP-C200', 'TP-C410',
  'TP-C120', 'TP-I100', 'TP-H100', 'TP-P200', 'TP-P110',
  'TP-P320', 'TP-P120', 'TP-P310', 'TP-P330', 'TP-PA100',
  'TP-PA110', 'TP-PA120', 'TP-C050', 'TP-C100', 'TP-C110',
  'TP-I200', 'TP-C300', 'TP-C310', 'TP-C400', 'TP-U100',
] as const

const EXPECTED_RECORD_KEYS = [
  'customerProblemHeadline',
  'discussFirstWhen',
  'evidenceStatement',
  'eyebrow',
  'family',
  'faqItems',
  'fitWhen',
  'metaDescription',
  'metaTitle',
  'packaging',
  'path',
  'performancePriorities',
  'positioning',
  'primaryApplication',
  'process',
  'productId',
  'productType',
  'quickAnswer',
  'recommendedApplications',
  'relatedLinks',
  'slug',
  'surfaceTreatment',
  'tdsAccess',
  'title',
  'typicalProperties',
  'validationChecklist',
] as const

const temporaryDirectories: string[] = []

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) =>
    rm(directory, {recursive: true, force: true})))
})

async function manifestApi() {
  return import('@/lib/products/content-manifest')
}

function visibleWords(count = 45): string {
  return `<p>${Array.from(
    {length: count},
    (_, index) => `word${index + 1}`,
  ).join(' ')}</p>`
}

function productTarget(productId: string) {
  return {targetType: 'product' as const, targetKey: productId}
}

function productRecord(productId: string) {
  const slug = productId.toLowerCase()
  const otherProductId = productId === EXPECTED_PRODUCT_IDS[0]
    ? EXPECTED_PRODUCT_IDS[1]
    : EXPECTED_PRODUCT_IDS[0]

  return {
    productId,
    slug,
    path: `/products/${slug}`,
    title: `TIOVAR ${productId}`,
    family: {targetType: 'productFamily', targetKey: 'plastics'},
    metaTitle: `TIOVAR ${productId} titanium dioxide`,
    metaDescription: `Evaluate TIOVAR ${productId} for an industrial formulation with representative customer testing.`,
    eyebrow: 'TIOVAR titanium dioxide',
    customerProblemHeadline: 'Compare a candidate grade against the requirements of your formulation.',
    quickAnswer: visibleWords(),
    productType: 'Titanium dioxide pigment',
    process: 'Verified process description',
    primaryApplication: 'Industrial plastics',
    positioning: 'A candidate for customer evaluation',
    surfaceTreatment: 'Verified surface-treatment description',
    packaging: 'Packaging options should be confirmed for the destination market.',
    tdsAccess: 'The current technical data sheet is available by request.',
    fitWhen: [
      'The formulation requires a documented evaluation candidate.',
      'Representative processing trials can be completed.',
      'Final suitability will be confirmed by the customer.',
    ],
    discussFirstWhen: ['The processing window or end-use requirement is unusual.'],
    performancePriorities: [
      {title: 'Evaluation', explanation: 'Compare the grade in the intended formulation.'},
      {title: 'Processing', explanation: 'Confirm behavior under representative conditions.'},
      {title: 'Verification', explanation: 'Use customer testing before final selection.'},
    ],
    recommendedApplications: [
      {targetType: 'application' as const, targetKey: 'plastics-masterbatch'},
    ],
    evidenceStatement: '<p>Typical data supports comparison, while customer testing confirms final suitability.</p>',
    typicalProperties: [
      {property: 'Typical property', value: '1.0', unit: '%', displayOrder: 1},
    ],
    validationChecklist: ['Test the grade in the intended formulation.'],
    faqItems: Array.from({length: 6}, (_, index) => ({
      question: `What should be checked in evaluation ${index + 1}?`,
      answer: '<p>Confirm the relevant result with representative customer testing.</p>',
    })),
    relatedLinks: {
      applications: [
        {targetType: 'application' as const, targetKey: 'industrial-plastics'},
      ],
      resources: [
        {targetType: 'resource' as const, targetKey: 'tds-request-guide'},
      ],
      products: [productTarget(otherProductId)],
    },
  }
}

function completeManifest() {
  return {
    version: '0.1',
    siteId: 'tio2-a',
    products: EXPECTED_PRODUCT_IDS.map(productRecord),
  }
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

async function expectStrictRejection(input: unknown): Promise<void> {
  const {productContentManifestSchema} = await manifestApi()
  expect(productContentManifestSchema.safeParse(input).success).toBe(false)
}

async function temporaryManifest(input: unknown): Promise<{
  directory: string
  path: string
  bytes: Buffer
}> {
  const directory = await mkdtemp(join(tmpdir(), 'product-manifest-'))
  temporaryDirectories.push(directory)
  const path = join(directory, 'manifest.json')
  const bytes = Buffer.from(`${JSON.stringify(input, null, 2)}\n`)
  await writeFile(path, bytes)
  return {directory, path, bytes}
}

function runCli(args: string[]) {
  return spawnSync(
    process.execPath,
    ['scripts/products/validate-product-manifest.mjs', ...args],
    {cwd: process.cwd(), encoding: 'utf8'},
  )
}

describe('Site A Product content manifest', () => {
  it('accepts exactly the canonical 25 Product IDs and mappings', async () => {
    const {
      SITE_A_PRODUCT_IDS,
      validateProductContentManifest,
    } = await manifestApi()

    expect(SITE_A_PRODUCT_IDS).toEqual(EXPECTED_PRODUCT_IDS)
    const result = validateProductContentManifest(completeManifest())
    expect(result.products).toHaveLength(25)
    expect(result.products.map(({productId, slug, path}) => ({productId, slug, path})))
      .toEqual(EXPECTED_PRODUCT_IDS.map((productId) => ({
        productId,
        slug: productId.toLowerCase(),
        path: `/products/${productId.toLowerCase()}`,
      })))
  })

  it('contains only the author-owned public Product record shape', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const result = validateProductContentManifest(completeManifest())

    expect(Object.keys(result.products[0]).sort()).toEqual(EXPECTED_RECORD_KEYS)
    expect(result.products[0]).not.toHaveProperty('modified')
    expect(result.products[0]).not.toHaveProperty('modifiedGmt')
    expect(result.products[0]).not.toHaveProperty('status')
    expect(result.products[0]).not.toHaveProperty('databaseId')
    expect(result.products[0]).not.toHaveProperty('inquiryFields')
  })

  it.each([
    ['unknown root key', (manifest: ReturnType<typeof completeManifest>) => {
      Reflect.set(manifest, 'notes', 'private')
    }],
    ['wrong site', (manifest: ReturnType<typeof completeManifest>) => {
      manifest.siteId = 'tio2-b'
    }],
    ['unknown Product key', (manifest: ReturnType<typeof completeManifest>) => {
      Reflect.set(manifest.products[0], 'modifiedGmt', '2026-08-26T00:00:00')
    }],
  ] as const)('rejects a strict root/record contract with %s', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input)
    await expectStrictRejection(input)
  })

  it.each([
    ['duplicate', (manifest: ReturnType<typeof completeManifest>) => {
      manifest.products[1] = clone(manifest.products[0])
    }],
    ['missing', (manifest: ReturnType<typeof completeManifest>) => {
      manifest.products.pop()
    }],
    ['extra', (manifest: ReturnType<typeof completeManifest>) => {
      manifest.products.push(productRecord('TP-Z999'))
    }],
  ] as const)('rejects a %s Product ID in strict mode', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input)
    await expectStrictRejection(input)
  })

  it.each([
    ['uppercase slug', (record: ReturnType<typeof productRecord>) => {
      record.slug = record.productId
    }],
    ['mismatched path', (record: ReturnType<typeof productRecord>) => {
      record.path = '/products/tp-p300'
    }],
    ['trailing slash', (record: ReturnType<typeof productRecord>) => {
      record.path = `${record.path}/`
    }],
  ] as const)('rejects a noncanonical Product route: %s', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input.products[0])
    await expectStrictRejection(input)
  })

  it.each([39, 71])('rejects a %i-visible-word Quick Answer', async (count) => {
    const input = completeManifest()
    input.products[0].quickAnswer = visibleWords(count)
    await expectStrictRejection(input)
  })

  it.each([
    ['fitWhen', 2, (record: ReturnType<typeof productRecord>) => record.fitWhen],
    ['fitWhen', 6, (record: ReturnType<typeof productRecord>) => record.fitWhen],
    ['discussFirstWhen', 0, (record: ReturnType<typeof productRecord>) => record.discussFirstWhen],
    ['discussFirstWhen', 6, (record: ReturnType<typeof productRecord>) => record.discussFirstWhen],
    ['performancePriorities', 2, (record: ReturnType<typeof productRecord>) => record.performancePriorities],
    ['performancePriorities', 7, (record: ReturnType<typeof productRecord>) => record.performancePriorities],
    ['recommendedApplications', 0, (record: ReturnType<typeof productRecord>) => record.recommendedApplications],
    ['recommendedApplications', 13, (record: ReturnType<typeof productRecord>) => record.recommendedApplications],
    ['validationChecklist', 21, (record: ReturnType<typeof productRecord>) => record.validationChecklist],
  ] as const)('rejects %s with %i entries', async (_label, count, select) => {
    const input = completeManifest()
    const list = select(input.products[0])
    const seed = list[0] ?? 'item'
    list.splice(0, list.length, ...Array.from({length: count}, () => clone(seed)) as never[])
    await expectStrictRejection(input)
  })

  it.each([5, 11])('rejects %i FAQ items', async (count) => {
    const input = completeManifest()
    const seed = input.products[0].faqItems[0]
    input.products[0].faqItems = Array.from({length: count}, () => clone(seed))
    await expectStrictRejection(input)
  })

  it('requires at least one complete typical property and unique display order', async () => {
    const empty = completeManifest()
    empty.products[0].typicalProperties = []
    const duplicateOrder = completeManifest()
    duplicateOrder.products[0].typicalProperties.push({
      property: 'Second property', value: '2.0', unit: '%', displayOrder: 1,
    })

    await expectStrictRejection(empty)
    await expectStrictRejection(duplicateOrder)
  })

  it.each([
    ['wrong recommended type', (record: ReturnType<typeof productRecord>) => {
      Reflect.set(record.recommendedApplications[0], 'targetType', 'resource')
    }],
    ['public URL target', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.resources[0].targetKey = 'https://example.test/resources/testing'
    }],
    ['path target', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.applications[0].targetKey = '/applications/plastics'
    }],
    ['unknown Product target', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.products[0].targetKey = 'TP-Z999'
    }],
    ['self Product target', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.products[0].targetKey = record.productId
    }],
  ] as const)('rejects an unsafe relationship: %s', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input.products[0])
    await expectStrictRejection(input)
  })

  it('allows a safe resource target that discusses requesting a TDS', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].relatedLinks.resources[0].targetKey = 'how-to-request-a-tds'
    input.products[0].evidenceStatement = '<p>Read the resource explaining how to request a TDS for evaluation.</p>'

    expect(validateProductContentManifest(input).products).toHaveLength(25)
  })

  it.each([
    'A current TDS can be downloaded.',
    'The technical data sheet is public.',
    'The TDS is available online.',
  ])('rejects non-request-only TDS wording: %s', async (tdsAccess) => {
    const input = completeManifest()
    input.products[0].tdsAccess = tdsAccess
    await expectStrictRejection(input)
  })

  it.each([
    ['HTTP PDF', 'Read https://files.example.test/TP-P100.pdf?download=1'],
    ['PDF filename', 'See TP-P100.pdf for details'],
    ['documents TDS path', 'Read /documents/tds/tp-p100'],
    ['private TDS path', 'Read /tds/tp-p100'],
    ['file URL', 'Read file:///D:/sources/TP-P100'],
    ['Windows path', 'Read D:\\11SEO\\sources\\TP-P100'],
    ['UNC path', 'Read \\\\server\\share\\TP-P100'],
    ['guarantee', 'This grade guarantees the final result.'],
    ['equivalence', 'This grade is equivalent to the incumbent grade.'],
    ['price', 'The price is USD 2 per kilogram.'],
    ['stock', 'This product is in stock for immediate shipment.'],
    ['availability', 'This product has immediate availability.'],
  ])('recursively rejects a forbidden value: %s', async (_label, value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(input)
  })

  it.each([
    'manufacturer',
    'legalEntity',
    'sourceFile',
    'sourcePage',
    'sourceNote',
    'evidenceStatus',
    'reviewer',
    'reviewDate',
    'approvalHistory',
    'tdsUrl',
    'price',
    'stockStatus',
    'availability',
  ])('recursively rejects the forbidden key %s', async (key) => {
    const input = completeManifest()
    Reflect.set(input.products[0].typicalProperties[0], key, 'private')
    await expectStrictRejection(input)
  })

  it('permits only a unique nonempty canonical subset in batch mode', async () => {
    const {validateProductContentBatch} = await manifestApi()
    const subset = completeManifest()
    subset.products = [subset.products[2], subset.products[0]]

    expect(validateProductContentBatch(subset).products.map(({productId}) => productId))
      .toEqual(['TP-S100', 'TP-P100'])

    const empty = clone(subset)
    empty.products = []
    expect(() => validateProductContentBatch(empty)).toThrow()

    const duplicate = clone(subset)
    duplicate.products.push(clone(duplicate.products[0]))
    expect(() => validateProductContentBatch(duplicate)).toThrow()

    const noncanonical = clone(subset)
    noncanonical.products[0] = productRecord('TP-Z999')
    expect(() => validateProductContentBatch(noncanonical)).toThrow()

    const unsafe = clone(subset)
    unsafe.products[0].tdsAccess = 'Download /tds/private.pdf'
    expect(() => validateProductContentBatch(unsafe)).toThrow()
  })

  it('produces a deterministic SHA-256 summary without reordering its input', async () => {
    const {summarizeProductContentManifest, validateProductContentManifest} = await manifestApi()
    const forward = validateProductContentManifest(completeManifest())
    const reverseInput = completeManifest()
    reverseInput.products.reverse()
    const reverse = validateProductContentManifest(reverseInput)
    const originalOrder = reverse.products.map(({productId}) => productId)

    const first = summarizeProductContentManifest(forward)
    const second = summarizeProductContentManifest(reverse)
    expect(first).toEqual(second)
    expect(first.count).toBe(25)
    expect(first.productIds).toEqual([...EXPECTED_PRODUCT_IDS].sort())
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(reverse.products.map(({productId}) => productId)).toEqual(originalOrder)

    const changed = clone(forward)
    changed.products[0].title = `${changed.products[0].title} changed`
    expect(summarizeProductContentManifest(changed).sha256).not.toBe(first.sha256)
  })
})

describe('Product manifest validator CLI', () => {
  it('validates an exact file, prints JSON, and never rewrites the source', async () => {
    const fixture = await temporaryManifest(completeManifest())
    const result = runCli([fixture.path])

    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      count: 25,
      productIds: [...EXPECTED_PRODUCT_IDS].sort(),
    })
    expect(JSON.parse(result.stdout).sha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(await readFile(fixture.path)).toEqual(fixture.bytes)
  })

  it('defaults to strict mode and prints diagnostics with a nonzero exit', async () => {
    const incomplete = completeManifest()
    incomplete.products = incomplete.products.slice(0, 1)
    const fixture = await temporaryManifest(incomplete)
    const result = runCli([fixture.path])

    expect(result.status).not.toBe(0)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('products')
    expect(await readFile(fixture.path)).toEqual(fixture.bytes)
  })

  it('accepts a safe canonical subset only with --allow-incomplete', async () => {
    const incomplete = completeManifest()
    incomplete.products = [incomplete.products[3]]
    const fixture = await temporaryManifest(incomplete)
    const result = runCli(['--allow-incomplete', fixture.path])

    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout)).toMatchObject({
      count: 1,
      productIds: ['TP-C200'],
    })
    expect(JSON.parse(result.stdout).sha256).toMatch(/^[a-f0-9]{64}$/u)
    expect(await readFile(fixture.path)).toEqual(fixture.bytes)
  })

  it.each([
    [[]],
    [['one.json', 'two.json']],
    [['--unknown', 'one.json']],
  ])('rejects invalid arguments %j', (args) => {
    const result = runCli(args)

    expect(result.status).not.toBe(0)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('Usage:')
  })

  it('reports malformed JSON without modifying the file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'product-manifest-'))
    temporaryDirectories.push(directory)
    const path = join(directory, 'invalid.json')
    const bytes = Buffer.from('{invalid json\n')
    await writeFile(path, bytes)

    const result = runCli([path])

    expect(result.status).not.toBe(0)
    expect(result.stdout).toBe('')
    expect(result.stderr).toContain('invalid.json')
    expect(await readFile(path)).toEqual(bytes)
  })
})
