import {mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {spawn, spawnSync} from 'node:child_process'

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

function reverseObjectKeyOrder<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(reverseObjectKeyOrder) as T
  }
  if (!value || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).reverse().map(([key, item]) => [
      key,
      reverseObjectKeyOrder(item),
    ]),
  ) as T
}

function applicationTargets(count: number) {
  return Array.from({length: count}, (_, index) => ({
    targetType: 'application' as const,
    targetKey: `application-${index + 1}`,
  }))
}

function resourceTargets(count: number) {
  return Array.from({length: count}, (_, index) => ({
    targetType: 'resource' as const,
    targetKey: `resource-${index + 1}`,
  }))
}

async function strictIssues(input: unknown): Promise<readonly {
  path: PropertyKey[]
  message: string
}[]> {
  const {productContentManifestSchema} = await manifestApi()
  const result = productContentManifestSchema.safeParse(input)
  expect(result.success).toBe(false)
  if (result.success) return []
  return result.error.issues
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

function runCli(args: string[], nodeArgs: string[] = []) {
  return spawnSync(
    process.execPath,
    [...nodeArgs, 'scripts/products/validate-product-manifest.mjs', ...args],
    {cwd: process.cwd(), encoding: 'utf8'},
  )
}

function runCliAsync(args: string[]): Promise<{
  status: number | null
  stdout: string
  stderr: string
}> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ['scripts/products/validate-product-manifest.mjs', ...args],
      {cwd: process.cwd(), stdio: ['ignore', 'pipe', 'pipe']},
    )
    let stdout = ''
    let stderr = ''
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk
    })
    child.once('error', reject)
    child.once('close', (status) => resolve({status, stdout, stderr}))
  })
}

async function loaderResidues(): Promise<string[]> {
  return (await readdir('lib/products'))
    .filter((name) => /^\.content-manifest\..+\.mjs$/u.test(name))
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

  it('reports the exact-25 rule and every missing canonical ID together', async () => {
    const input = completeManifest()
    const missingIds = [
      input.products[3].productId,
      input.products[17].productId,
    ]
    input.products = input.products.filter(({productId}) =>
      !missingIds.includes(productId))

    const messages = (await strictIssues(input)).map(({message}) => message)
    expect(messages).toContain(
      'A complete Product manifest must contain exactly 25 records',
    )
    expect(messages).toContain(`Missing canonical Product ID: ${missingIds[0]}`)
    expect(messages).toContain(`Missing canonical Product ID: ${missingIds[1]}`)
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

  it.each([40, 70])('accepts a %i-visible-word Quick Answer boundary', async (count) => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].quickAnswer = visibleWords(count)

    expect(validateProductContentManifest(input).products[0].quickAnswer)
      .toBe(visibleWords(count))
  })

  it.each([39, 71])('rejects a %i-visible-word Quick Answer boundary', async (count) => {
    const input = completeManifest()
    input.products[0].quickAnswer = visibleWords(count)
    await expectStrictRejection(input)
  })

  it.each([40, 70])(
    'counts %i list-item words at downstream HTML tag boundaries',
    async (count) => {
      const {validateProductContentManifest} = await manifestApi()
      const input = completeManifest()
      input.products[0].quickAnswer = `<ul>${Array.from(
        {length: count},
        (_, index) => `<li>word${index + 1}</li>`,
      ).join('')}</ul>`

      expect(validateProductContentManifest(input).products[0].quickAnswer)
        .toBe(input.products[0].quickAnswer)
    },
  )

  it.each([
    ['fitWhen', 2, (record: ReturnType<typeof productRecord>) => record.fitWhen],
    ['fitWhen', 6, (record: ReturnType<typeof productRecord>) => record.fitWhen],
    ['discussFirstWhen', 0, (record: ReturnType<typeof productRecord>) => record.discussFirstWhen],
    ['discussFirstWhen', 6, (record: ReturnType<typeof productRecord>) => record.discussFirstWhen],
    ['performancePriorities', 2, (record: ReturnType<typeof productRecord>) => record.performancePriorities],
    ['performancePriorities', 7, (record: ReturnType<typeof productRecord>) => record.performancePriorities],
    ['recommendedApplications', 0, (record: ReturnType<typeof productRecord>) => record.recommendedApplications],
    ['validationChecklist', 21, (record: ReturnType<typeof productRecord>) => record.validationChecklist],
  ] as const)('rejects %s with %i entries', async (_label, count, select) => {
    const input = completeManifest()
    const list = select(input.products[0])
    const seed = list[0] ?? 'item'
    list.splice(0, list.length, ...Array.from({length: count}, () => clone(seed)) as never[])
    await expectStrictRejection(input)
  })

  it('accepts 12 unique recommended applications and rejects 13', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const accepted = completeManifest()
    accepted.products[0].recommendedApplications = applicationTargets(12)
    expect(validateProductContentManifest(accepted).products[0].recommendedApplications)
      .toHaveLength(12)

    const rejected = completeManifest()
    rejected.products[0].recommendedApplications = applicationTargets(13)
    await expectStrictRejection(rejected)
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

  it('accepts 50 complete typical properties and rejects 51', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const properties = Array.from({length: 51}, (_, index) => ({
      property: `Property ${index + 1}`,
      value: `${index + 1}`,
      unit: '%',
      displayOrder: index + 1,
    }))
    const accepted = completeManifest()
    accepted.products[0].typicalProperties = properties.slice(0, 50)
    expect(validateProductContentManifest(accepted).products[0].typicalProperties)
      .toHaveLength(50)

    const rejected = completeManifest()
    rejected.products[0].typicalProperties = properties
    await expectStrictRejection(rejected)
  })

  it.each([
    ['property', (property: Record<string, unknown>) => delete property.property],
    ['value', (property: Record<string, unknown>) => delete property.value],
    ['unit', (property: Record<string, unknown>) => delete property.unit],
    ['positive display order', (property: Record<string, unknown>) => {
      property.displayOrder = 0
    }],
  ] as const)('requires typical-property %s', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input.products[0].typicalProperties[0])
    await expectStrictRejection(input)
  })

  it.each([
    ['recommended applications', (record: ReturnType<typeof productRecord>) => {
      record.recommendedApplications = applicationTargets(2)
      record.recommendedApplications[1] = clone(record.recommendedApplications[0])
    }],
    ['related applications', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.applications = applicationTargets(2)
      record.relatedLinks.applications[1] = clone(record.relatedLinks.applications[0])
    }],
    ['related resources', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.resources = resourceTargets(2)
      record.relatedLinks.resources[1] = clone(record.relatedLinks.resources[0])
    }],
    ['related products', (record: ReturnType<typeof productRecord>) => {
      record.relatedLinks.products = [
        productTarget(EXPECTED_PRODUCT_IDS[1]),
        productTarget(EXPECTED_PRODUCT_IDS[1]),
      ]
    }],
  ] as const)('rejects duplicate keys within %s below its maximum', async (_label, mutate) => {
    const input = completeManifest()
    mutate(input.products[0])
    await expectStrictRejection(input)
  })

  it.each([
    ['related applications', (record: ReturnType<typeof productRecord>, count: number) => {
      record.relatedLinks.applications = applicationTargets(count)
    }],
    ['related resources', (record: ReturnType<typeof productRecord>, count: number) => {
      record.relatedLinks.resources = resourceTargets(count)
    }],
    ['related products', (record: ReturnType<typeof productRecord>, count: number) => {
      record.relatedLinks.products = EXPECTED_PRODUCT_IDS
        .filter((productId) => productId !== record.productId)
        .slice(0, count)
        .map(productTarget)
    }],
  ] as const)('enforces the 12-item maximum for %s with unique keys', async (_label, assign) => {
    const {validateProductContentManifest} = await manifestApi()
    const accepted = completeManifest()
    assign(accepted.products[0], 12)
    expect(validateProductContentManifest(accepted).products).toHaveLength(25)

    const rejected = completeManifest()
    assign(rejected.products[0], 13)
    await expectStrictRejection(rejected)
  })

  it.each([
    ['quick Answer', (record: ReturnType<typeof productRecord>, value: string) => {
      record.quickAnswer = value
    }],
    ['evidence statement', (record: ReturnType<typeof productRecord>, value: string) => {
      record.evidenceStatement = value
    }],
    ['FAQ answer', (record: ReturnType<typeof productRecord>, value: string) => {
      record.faqItems[0].answer = value
    }],
  ] as const)('rejects required %s that sanitizes to no visible content', async (_label, assign) => {
    for (const value of [
      '<p><br></p>',
      '<script>hidden words only</script>',
      '<style>.hidden { display: none }</style>',
      '<img src="tracking.gif">',
    ]) {
      const input = completeManifest()
      assign(input.products[0], value)
      await expectStrictRejection(input)
    }
  })

  it('sanitizes required rich text while retaining supported visible HTML', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].evidenceStatement = [
      '<p onclick="unsafe()">Visible <strong>evidence</strong>.',
      '<script>hidden</script><img src="tracking.gif"></p>',
    ].join('')
    input.products[0].faqItems[0].answer =
      '<p>Use <em>representative</em> customer testing.</p>'

    const validated = validateProductContentManifest(input)
    expect(validated.products[0].evidenceStatement)
      .toBe('<p>Visible <strong>evidence</strong>.</p>')
    expect(validated.products[0].faqItems[0].answer)
      .toBe('<p>Use <em>representative</em> customer testing.</p>')
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

  it('allows stable relationship keys and safe public boundary wording', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].relatedLinks.resources[0].targetKey = 'how-to-request-a-tds'
    input.products[0].relatedLinks.applications[0].targetKey = 'brand-owner-guidance'
    input.products[0].evidenceStatement = [
      '<p>This grade does not guarantee performance and is not equivalent ',
      'to another grade. A guarantee claim requires evidence. Ask whether ',
      'the grades can be compared; do not assume direct replacement.</p>',
    ].join('')
    input.products[0].tdsAccess =
      'The TDS is not available for public download; request the current sheet.'
    input.products[0].faqItems[0].answer = [
      '<p>Who manufactures this grade? Does it guarantee performance? ',
      'Is it equivalent to another grade? Can the TDS be downloaded?</p>',
    ].join('')
    input.products[0].faqItems[1].answer =
      '<p>How can pricing, stock, and availability be confirmed?</p>'
    input.products[0].faqItems[2].answer = [
      '<p>Do not publish source notes, reviewer names, approval records, ',
      'or private evidence in public copy.</p>',
    ].join('')
    input.products[0].faqItems[3].answer = [
      '<p>This page does not identify a manufacturer, legal entity, ',
      'operator, or brand owner.</p>',
    ].join('')
    input.products[0].faqItems[4].answer = [
      '<p>No source note, reviewer, approval status, or private evidence ',
      'is published here. Current price, stock, and availability are not stated.</p>',
    ].join('')

    expect(validateProductContentManifest(input).products).toHaveLength(25)
  })

  it.each([
    'Is this grade equivalent to the incumbent? It is equivalent to the incumbent.',
    'Does this grade guarantee the outcome? It guarantees the final result.',
    'Can the TDS be downloaded? The TDS can be accessed directly.',
    'This grade does not guarantee color. It is equivalent to the incumbent.',
    'If this grade is equivalent to the incumbent, use it as a direct replacement.',
    'Whether this grade is equivalent to the incumbent depends on testing.',
  ])('rejects a positive claim outside an unrelated question or negation: %s', async (value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(input)
  })

  it('allows genuine FAQ questions and explicit claim-local negations', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].faqItems[0].answer = [
      '<p>Does this grade guarantee the final result? Is it equivalent to ',
      'the incumbent grade? Can the TDS be downloaded?</p>',
    ].join('')
    input.products[0].faqItems[1].answer = [
      '<p>This grade does not guarantee the final result and is not guaranteed ',
      'to produce a specific outcome. It is not equivalent to the incumbent.</p>',
    ].join('')
    input.products[0].tdsAccess = [
      'The TDS is not available for public download; request the current ',
      'technical data sheet.',
    ].join('')

    expect(validateProductContentManifest(input).products).toHaveLength(25)
  })

  it.each([
    'It is not. It guarantees performance.',
    'It is not. Current pricing is available.',
    'It is not. Stock is available.',
    'It is not. Commercial availability is confirmed.',
    'It is not. Reviewed by Alice.',
    'Is pricing disclosed? Current pricing is available.',
    'If pricing is requested, current pricing is available.',
    'Is stock disclosed? Stock is available.',
    'If availability is requested, commercial availability is confirmed.',
    'Was this page reviewed? Reviewed by Alice.',
  ])('preserves an asserted clause after an unrelated boundary: %s', async (value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(input)
  })

  it.each([
    'Alice reviewed<br>this content.',
    'Current pricing<br>is available.',
    'The TDS can be<br>downloaded.',
    'ALICE REVIEWED<BR>THIS CONTENT.',
    'Current pricing</p><p>is available.',
    'The TDS can be&nbsp;<br>downloaded.',
  ])('uses supported HTML tags as safety-scanning word boundaries: %s', async (answer) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = answer
    await expectStrictRejection(input)
  })

  it.each([
    'Alice reviewed<span>this</span> content.',
    'Current pricing<mark>is</mark> available.',
    'The TDS can be<x-boundary>downloaded</x-boundary>.',
  ])('uses every raw HTML tag as a safety-scanning boundary: %s', async (answer) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = answer

    const issues = await strictIssues(input)
    expect(issues.filter(({path}) =>
      path.join('.') === 'products.0.faqItems.0.answer',
    )).toHaveLength(1)
  })

  it.each([
    'Manufactured by Example Co.',
    'Manufacturer — Example Co.',
    'mAnUfAcTuReR &mdash; Example Co.',
    'Reviewer — Alice',
    'rEvIeWeR &mdash; Alice',
    'Source file — internal record',
    'Availability — immediate',
  ])('rejects a bounded disclosure in plain and rich fields: %s', async (value) => {
    const plain = completeManifest()
    plain.products[0].packaging = value
    await expectStrictRejection(plain)

    const rich = completeManifest()
    rich.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(rich)
  })

  it.each([
    'Manufacturer—Example Co.',
    'Manufacturer —Example Co.',
    'Manufacturer— Example Co.',
    'Manufacturer — Example Co.',
    'Manufacturer–Example Co.',
    'Manufacturer –Example Co.',
    'Manufacturer– Example Co.',
    'Manufacturer – Example Co.',
    'Reviewer—Alice',
    'Reviewer —Alice',
    'Reviewer— Alice',
    'Reviewer — Alice',
    'Reviewer–Alice',
    'Reviewer –Alice',
    'Reviewer– Alice',
    'Reviewer – Alice',
    'Source file—internal record',
    'Source file —internal record',
    'Source file— internal record',
    'Source file — internal record',
    'Source file–internal record',
    'Source file –internal record',
    'Source file– internal record',
    'Source file – internal record',
    'Availability—immediate',
    'Availability —immediate',
    'Availability— immediate',
    'Availability — immediate',
    'Availability–immediate',
    'Availability –immediate',
    'Availability– immediate',
    'Availability – immediate',
  ])('normalizes an en/em-dash disclosure separator with any spacing: %s', async (value) => {
    const plain = completeManifest()
    plain.products[0].packaging = value
    await expectStrictRejection(plain)

    const rich = completeManifest()
    rich.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(rich)
  })

  it.each([
    '<p data-manufacturer="Example Co.">Public guidance.</p>',
    '<p DATA-MANUFACTURER="Example &amp; Co.">Public guidance.</p>',
    '<p data-reviewer="Alice">Public guidance.</p>',
    '<p DATA-REVIEWER="ALICE">Public guidance.</p>',
  ])('scans decoded HTML attribute names together with their values: %s', async (answer) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = answer

    const issues = await strictIssues(input)
    expect(issues.filter(({path}) =>
      path.join('.') === 'products.0.faqItems.0.answer',
    )).toHaveLength(1)
  })

  it.each([
    '<p dataManufacturer="Example Co.">Public guidance.</p>',
    '<p dataReviewer="Alice">Public guidance.</p>',
    '<p dataSourceFile="internal record">Public guidance.</p>',
    '<p dataAvailability="immediate">Public guidance.</p>',
    '<p data-source-file="internal record">Public guidance.</p>',
    '<p data_source_file="internal record">Public guidance.</p>',
    '<p data-availability="immediate">Public guidance.</p>',
    '<p data_availability="immediate">Public guidance.</p>',
  ])('tokenizes disclosure-bearing HTML attribute names once: %s', async (answer) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = answer

    const issues = await strictIssues(input)
    expect(issues.filter(({path}) =>
      path.join('.') === 'products.0.faqItems.0.answer',
    )).toHaveLength(1)
  })

  it('preserves ordinary allowed href/title attributes and stable relationship keys', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].faqItems[0].answer = [
      '<p>Read the <a href="/resources/application-guide" ',
      'title="Application guide">application guide</a>.</p>',
    ].join('')
    input.products[0].relatedLinks.resources[0].targetKey =
      'application-guide'

    const validated = validateProductContentManifest(input)
    expect(validated.products[0].faqItems[0].answer).toContain(
      'href="/resources/application-guide" title="Application guide"',
    )
    expect(validated.products[0].relatedLinks.resources[0].targetKey)
      .toBe('application-guide')
  })

  it.each([
    'Manufacturer is not identified on this page.',
    "Manufacturer isn't identified on this page.",
    'This page does not identify a manufacturer.',
    "This page doesn't identify a manufacturer.",
    'Reviewer is not named.',
    "Reviewer isn't named.",
    'Private evidence is not published.',
    "Private evidence isn't published.",
    'Current pricing is not stated.',
    "Current pricing isn't stated.",
    'This grade should not be treated as equivalent to the incumbent.',
    "This grade shouldn't be treated as equivalent to the incumbent.",
    'This grade cannot be treated as equivalent to the incumbent.',
    "This grade can't be treated as equivalent to the incumbent.",
    'This grade could not be treated as equivalent to the incumbent.',
    "This grade couldn't be treated as equivalent to the incumbent.",
    'This grade would not be treated as equivalent to the incumbent.',
    "This grade wouldn't be treated as equivalent to the incumbent.",
    'The TDS should not be downloaded.',
    "The TDS shouldn't be downloaded.",
    "The TDS mustn't be downloaded.",
    'The TDS cannot be downloaded.',
    "The TDS can't be downloaded.",
    'The TDS could not be downloaded.',
    "The TDS couldn't be downloaded.",
    'The TDS would not be downloaded.',
    "The TDS wouldn't be downloaded.",
  ])('allows an explicit denial bound to its matched disclosure: %s', async (value) => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`

    expect(validateProductContentManifest(input).products).toHaveLength(25)
  })

  it.each([
    'Manufacturer is identified as Example Co.',
    'This page identifies Example Company as the manufacturer.',
    'Reviewer is named as Alice.',
    'Private evidence is published.',
    'Current pricing is stated.',
    'This grade should be treated as equivalent to the incumbent.',
    'This grade can be treated as equivalent to the incumbent.',
    'This grade could be treated as equivalent to the incumbent.',
    'This grade would be treated as equivalent to the incumbent.',
    'The TDS should be downloaded.',
    'The TDS can be downloaded.',
    'The TDS could be downloaded.',
    'The TDS would be downloaded.',
  ])('rejects the positive counterpart of an explicit denial: %s', async (value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(input)
  })

  it.each([
    'This grade cannot be treated as equivalent to the incumbent. It can be treated as equivalent to the incumbent.',
    "This grade couldn't be treated as equivalent to the incumbent. It could be treated as equivalent to the incumbent.",
    "The TDS wouldn't be downloaded. The TDS would be downloaded.",
  ])('does not let an auxiliary denial suppress a later assertion: %s', async (value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = `<p>${value}</p>`
    await expectStrictRejection(input)
  })

  it.each([
    ['manufacturer identity', 'Example Co. is our manufacturer.'],
    ['operator label', 'Operator: Example Co.'],
    ['legal identity', 'Example Co. is the legal entity.'],
    ['brand-owner identity', 'Example Co. is the brand owner.'],
    ['active content review', 'Alice reviewed this content.'],
    ['positive pricing', 'Current pricing is available.'],
    ['on-hand stock', 'This grade is on hand for immediate shipment.'],
    ['commercial availability', 'Commercial availability is confirmed.'],
    ['direct TDS access', 'The TDS can be accessed directly.'],
    ['workspace path', 'Read /workspace/team/TP-P100/source.json.'],
    ['mounted path', 'Read /mnt/share/TP-P100/source.json.'],
  ])('rejects the demonstrated plain-string bypass: %s', async (_label, value) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = value
    await expectStrictRejection(input)
  })

  it.each([
    ['manufacturer identity', 'Example Co. is our manufacturer.'],
    ['active content review', 'Alice reviewed this content.'],
    ['positive pricing', 'Current pricing is available.'],
    ['on-hand stock', 'This grade is on hand for immediate shipment.'],
    ['direct TDS access', 'The TDS can be accessed directly.'],
    ['private path', 'Read /workspace/team/TP-P100/source.json.'],
  ])('rejects the demonstrated raw plain-field bypass: %s', async (_label, packaging) => {
    const input = completeManifest()
    input.products[0].packaging = packaging
    await expectStrictRejection(input)
  })

  it.each([
    ['Windows path', 'D:\\private\\TP-P100.txt'],
    ['UNC path', '\\\\server\\share\\TP-P100.txt'],
    ['POSIX home path', '/home/editor/TP-P100.txt'],
    ['macOS home path', '/Users/editor/TP-P100.txt'],
    ['workspace path', '/workspace/team/TP-P100.txt'],
    ['mounted path', '/mnt/share/TP-P100.txt'],
  ])('rejects a private location hidden in a plain-field HTML attribute: %s', async (_label, location) => {
    const input = completeManifest()
    input.products[0].packaging = `<span data-location="${location}">Confirm packaging.</span>`
    await expectStrictRejection(input)
  })

  it.each([
    ['removed rich-text attribute', '<p data-note="Example Co. is our manufacturer">Public guidance.</p>'],
    ['preserved rich-text attribute', '<a href="/resources/guide" title="Alice reviewed this content">Public guidance</a>'],
    ['removed rich-text element', '<img alt="Current pricing is available"><p>Public guidance.</p>'],
  ])('rejects forbidden material hidden in %s', async (_label, answer) => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer = answer
    await expectStrictRejection(input)
  })

  it('reports one diagnostic for forbidden rich-text attribute material', async () => {
    const input = completeManifest()
    input.products[0].faqItems[0].answer =
      '<a href="/resources/guide" title="Alice reviewed this content">Public guidance</a>'

    const issues = await strictIssues(input)
    expect(issues.filter(({message, path}) =>
      message === 'Internal source, review, approval, and private-evidence disclosures are forbidden' &&
      path.join('.') === 'products.0.faqItems.0.answer',
    )).toHaveLength(1)
  })

  it('allows customer-facing trial, review, approval, and availability guidance', async () => {
    const {validateProductContentManifest} = await manifestApi()
    const input = completeManifest()
    input.products[0].faqItems[0].answer =
      '<p>Representative trials were made by the application laboratory.</p>'
    input.products[0].faqItems[1].answer =
      "<p>The results were reviewed by the customer's technical team.</p>"
    input.products[0].faqItems[2].answer =
      '<p>The formulation was approved by the customer.</p>'
    input.products[0].faqItems[3].answer =
      '<p>Ask us to confirm current availability for your market.</p>'
    input.products[0].packaging =
      'Representative trials were made by the application laboratory.'
    input.products[0].fitWhen[0] =
      "The results were reviewed by the customer's technical team."
    input.products[0].fitWhen[1] =
      'The formulation was approved by the customer.'
    input.products[0].fitWhen[2] =
      'Ask us to confirm current availability for your market.'

    expect(validateProductContentManifest(input).products).toHaveLength(25)
  })

  it.each([
    'A current TDS can be downloaded.',
    'The technical data sheet is public.',
    'The TDS is available online.',
    'Use direct TDS access after requesting the sheet.',
  ])('rejects non-request-only TDS wording: %s', async (tdsAccess) => {
    const input = completeManifest()
    input.products[0].tdsAccess = tdsAccess
    const issues = await strictIssues(input)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every(({path}) => path.join('.') === 'products.0.tdsAccess'))
      .toBe(true)
  })

  it.each([
    ['HTTP URL', 'Read https://example.test/products/tp-p100'],
    ['entity-encoded HTTP URL', 'Read HTTP&#58;&#47;&#47;example.test/details'],
    ['HTML-split HTTP URL', 'Read ht<strong>tps</strong>://example.test/details'],
    ['URL in an HTML attribute', '<a href="https://example.test/details">Read more</a>'],
    ['www URL', 'Read www.example.test/details'],
    ['PDF filename', 'See TP-P100.pdf for details'],
    ['documents TDS path', 'Read /documents/tds/tp-p100'],
    ['private TDS path', 'Read /tds/tp-p100'],
    ['file URL', 'Read file:///D:/sources/TP-P100'],
    ['Windows path', 'Read D:\\11SEO\\sources\\TP-P100'],
    ['UNC path', 'Read \\\\server\\share\\TP-P100'],
    ['network path', 'Read //server/share/TP-P100.txt'],
    ['network URL', 'Read smb://server/share/TP-P100.txt'],
    ['POSIX home path', 'Read /home/editor/sources/TP-P100.txt'],
    ['entity-encoded POSIX path', 'Read &#47;home&#47;editor&#47;TP-P100.txt'],
    ['macOS home path', 'Read /Users/editor/sources/TP-P100.txt'],
    ['tilde home path', 'Read ~/sources/TP-P100.txt'],
    ['generic POSIX file path', 'Read /workspace/team/sources/TP-P100.txt'],
    ['guarantee', 'This grade guarantees the final result.'],
    ['HTML-split guarantee', 'This grade guaran<strong>tees</strong> the final result.'],
    ['equivalence', 'This grade is equivalent&nbsp;to the incumbent grade.'],
    ['equivalence fragment', 'Equivalent to the incumbent grade.'],
    ['punctuated equivalence', 'This grade is equivalent---to the incumbent grade.'],
    ['direct replacement', 'This grade is a direct replacement for another grade.'],
    ['manufacturer identity', 'This grade is manufactured by Example Industrial Co.'],
    ['active manufacturer identity', 'Example Industrial Co. manufactures this grade.'],
    ['HTML-split manufacturer identity', 'This grade is manu<strong>factured</strong> by Example Co.'],
    ['legal identity', 'The legal entity is Example Global Ltd.'],
    ['operator identity', 'This product line is operated by Example Chemicals.'],
    ['active operator identity', 'Example Chemicals operates this product line.'],
    ['brand-owner identity', 'The brand owner is Example Holdings.'],
    ['source note disclosure', 'Source note: derived from internal page 4.'],
    ['source-page disclosure', 'Internal source page 4 supports this statement.'],
    ['review disclosure', 'Reviewed by Alice on 2026-08-01.'],
    ['reviewer disclosure', 'Reviewer is Alice.'],
    ['approval disclosure', 'Approval status: approved by legal.'],
    ['approval-history disclosure', 'Approval history records legal signoff.'],
    ['private-evidence disclosure', 'Private evidence: internal trial report 7.'],
    ['private-evidence assertion', 'Private evidence from trial report 7 supports this claim.'],
    ['price', 'The price is USD 2 per kilogram.'],
    ['currency price', 'This grade costs $2 per kilogram.'],
    ['stock', 'This product is in stock for immediate shipment.'],
    ['stock status', 'Stock status: in stock.'],
    ['inventory', 'Inventory is available today.'],
    ['availability', 'This product is available now.'],
    ['availability status', 'Availability: immediate.'],
    ['TDS download outside tdsAccess', 'Download the TDS directly after review.'],
    ['downloadable TDS outside tdsAccess', 'A downloadable technical data sheet is provided.'],
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

  it('produces a deterministic SHA-256 summary across product ordering without mutation', async () => {
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

  it('produces the same SHA-256 after recursively changing only object-key order', async () => {
    const {
      summarizeProductContentManifest,
      validateProductContentManifest,
    } = await manifestApi()
    const normal = completeManifest()
    const reordered = reverseObjectKeyOrder(normal)

    expect(summarizeProductContentManifest(
      validateProductContentManifest(reordered),
    ).sha256).toBe(summarizeProductContentManifest(
      validateProductContentManifest(normal),
    ).sha256)
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
    expect(result.stderr).toContain(
      'A complete Product manifest must contain exactly 25 records',
    )
    expect(result.stderr).toContain('Missing canonical Product ID: TP-P300')
    expect(await readFile(fixture.path)).toEqual(fixture.bytes)
  })

  it('runs with native TypeScript stripping disabled', async () => {
    const fixture = await temporaryManifest(completeManifest())
    const result = runCli([fixture.path], ['--no-strip-types'])

    expect(result.status).toBe(0)
    expect(JSON.parse(result.stdout).count).toBe(25)
    expect(result.stderr).toBe('')
    expect(await readFile(fixture.path)).toEqual(fixture.bytes)
    expect(await loaderResidues()).toEqual([])
  })

  it('uses concurrent-safe loader files and cleans them after success and failure', async () => {
    const sourcePath = 'lib/products/content-manifest.ts'
    const sourceBytes = await readFile(sourcePath)
    const valid = await temporaryManifest(completeManifest())
    const invalidInput = completeManifest()
    invalidInput.products = invalidInput.products.slice(0, 1)
    const invalid = await temporaryManifest(invalidInput)
    expect(await loaderResidues()).toEqual([])

    const results = await Promise.all([
      runCliAsync([valid.path]),
      runCliAsync([valid.path]),
      runCliAsync(['--allow-incomplete', valid.path]),
      runCliAsync([invalid.path]),
    ])

    expect(results.slice(0, 3).map(({status}) => status)).toEqual([0, 0, 0])
    expect(results[3].status).not.toBe(0)
    expect(results[3].stderr).toContain('Missing canonical Product ID')
    expect(await readFile(valid.path)).toEqual(valid.bytes)
    expect(await readFile(invalid.path)).toEqual(invalid.bytes)
    expect(await readFile(sourcePath)).toEqual(sourceBytes)
    expect(await loaderResidues()).toEqual([])
  })

  it('cleans a partially created loader when its write rejects', async () => {
    const fixture = await temporaryManifest(completeManifest())
    const preloadPath = join(fixture.directory, 'fail-loader-write.cjs')
    await writeFile(preloadPath, [
      "const fs = require('node:fs/promises')",
      "const {syncBuiltinESMExports} = require('node:module')",
      'const originalWriteFile = fs.writeFile',
      'fs.writeFile = async (...args) => {',
      '  await originalWriteFile(...args)',
      "  throw new Error('injected loader write failure')",
      '}',
      'syncBuiltinESMExports()',
      '',
    ].join('\n'))

    let result: ReturnType<typeof runCli>
    let residues: string[] = []
    try {
      result = runCli([fixture.path], ['--require', preloadPath])
      residues = await loaderResidues()
    } finally {
      await Promise.all((await loaderResidues()).map((name) =>
        rm(join('lib/products', name), {force: true})))
    }

    expect(result!.status).not.toBe(0)
    expect(result!.stderr).toContain('injected loader write failure')
    expect(residues).toEqual([])
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
