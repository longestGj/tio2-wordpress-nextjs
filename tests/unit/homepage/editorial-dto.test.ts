import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  HomepageContractError,
  HomepageVersionError,
} from '@/lib/wordpress/homepage-dto'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {makeSiteAEditorialHomepageNode} from '@/tests/mocks/handlers'

const rfqHref = 'mailto:contact@tio2products.com'

function fields(node = makeSiteAEditorialHomepageNode()) {
  return node.homepageFields as NonNullable<typeof node.homepageFields>
}

function editorial(node = makeSiteAEditorialHomepageNode()) {
  return node.editorialGeoFields as NonNullable<typeof node.editorialGeoFields>
}

function setField(target: object, key: string, value: unknown): void {
  Reflect.set(target, key, value)
}

function adapt(node = makeSiteAEditorialHomepageNode()) {
  return toSiteAEditorialHomepageDto(node, {rfqHref})
}

function mediaEdge(src: string, altText = 'Synthetic image') {
  return {
    node: {
      mediaItemUrl: src,
      altText,
      mimeType: 'image/webp',
      mediaDetails: {width: 1200, height: 800},
    },
  }
}

function setHeroImage(
  node: ReturnType<typeof makeSiteAEditorialHomepageNode>,
  src: string,
): void {
  setField(fields(node), 'heroImage', mediaEdge(src))
  setField(fields(node), 'heroImageAlt', 'Synthetic image')
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('toSiteAEditorialHomepageDto', () => {
  it('maps the complete Site A editorial source without product or application links', () => {
    const dto = adapt()

    expect(dto).toMatchObject({
      identity: {
        siteId: 'tio2-a',
        path: '/',
        schemaVersion: 'homepage-v0.2-editorial-geo',
        status: 'publish',
      },
      headerRfq: {
        label: 'Start an RFQ',
        href: rfqHref,
      },
      directAnswer: {
        question: 'What should a buyer clarify before sourcing titanium dioxide?',
      },
      closingCta: {label: 'Start an RFQ', href: rfqHref},
    })
    expect(dto.decisionQuestions).toHaveLength(6)
    expect(dto.applicationBriefs.every((item) => !('path' in item) && !('href' in item))).toBe(true)
    expect(dto.supplyRoutes.every((item) => item.claimBasis === 'synthetic_demo')).toBe(true)
    expect(dto.evidenceItems.every((item) => item.verificationStatus === 'demo')).toBe(true)
    expect(dto.faq.items).toHaveLength(8)
    expect(dto.glossary).toHaveLength(4)
  })

  it('normalizes whitespace while preserving case and punctuation', () => {
    const node = makeSiteAEditorialHomepageNode()
    setField(editorial(node), 'directAnswerLead', '  Keep\n\tCase, punctuation!  ')

    expect(adapt(node).directAnswer.lead).toBe('Keep Case, punctuation!')
  })

  it('accepts WordPress plain text containing comparison symbols and C1', () => {
    const node = makeSiteAEditorialHomepageNode()
    setField(
      editorial(node),
      'directAnswerLead',
      '  Compare 1 < 2 and 3 > 2.\u0085Keep punctuation.  ',
    )

    expect(adapt(node).directAnswer.lead).toBe(
      'Compare 1 < 2 and 3 > 2. Keep punctuation.',
    )
  })

  it.each([
    ['width', 0, 480],
    ['height', 640, 0],
  ])('rejects a non-positive Hero image %s', (dimension, width, height) => {
    const node = makeSiteAEditorialHomepageNode()
    setField(fields(node), 'heroImage', {
      node: {
        mediaItemUrl: 'http://localhost:8080/wp-content/uploads/synthetic.png',
        altText: 'Synthetic image',
        mimeType: 'image/png',
        mediaDetails: {width, height},
      },
    })
    setField(fields(node), 'heroImageAlt', 'Synthetic image')

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: `hero.image.${dimension}`,
    }))
  })

  it('maps GraphQL-null optional rows, URLs, labels, and image alt values', () => {
    const emptyRows = makeSiteAEditorialHomepageNode()
    setField(editorial(emptyRows), 'evidenceItems', null)
    setField(editorial(emptyRows), 'glossaryItems', null)
    setField(fields(emptyRows), 'secondaryTopics', null)
    setField(fields(emptyRows), 'heroImageAlt', null)

    expect(adapt(emptyRows)).toMatchObject({
      hero: {image: null},
      evidenceItems: [],
      glossary: [],
      seo: {secondaryTopics: []},
    })

    const nullableStrings = makeSiteAEditorialHomepageNode()
    setField(editorial(nullableStrings).supplyRoutes![0] as object, 'evidenceUrl', null)
    setField(editorial(nullableStrings).evidenceItems![0] as object, 'evidenceUrl', null)
    setField(editorial(nullableStrings).evidenceItems![0] as object, 'revisionLabel', null)

    const dto = adapt(nullableStrings)
    expect(dto.supplyRoutes[0]?.evidenceUrl).toBeNull()
    expect(dto.evidenceItems[0]).toMatchObject({
      evidenceUrl: null,
      revisionLabel: '',
    })
  })

  it('rejects foreign, missing, and multiple site scopes', () => {
    for (const nodes of [
      [{slug: 'tio2-b'}],
      [],
      [{slug: 'tio2-a'}, {slug: 'tio2-b'}],
    ]) {
      const node = makeSiteAEditorialHomepageNode()
      setField(node.siteScopes as object, 'nodes', nodes)
      expect(() => adapt(node)).toThrow(CrossSiteContentError)
    }
  })

  it.each([
    ['missing', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(fields(node), 'homepageSchemaVersion'), ''],
    ['null', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(fields(node), 'homepageSchemaVersion', null), ''],
    ['empty', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(fields(node), 'homepageSchemaVersion', ''), ''],
    ['legacy', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(fields(node), 'homepageSchemaVersion', 'homepage-v0.1'), 'homepage-v0.1'],
  ])('classifies a %s inner schema version as a version error without fallback', (_label, mutate, actualVersion) => {
    const node = makeSiteAEditorialHomepageNode()
    mutate(node)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageVersionError.name,
      actualVersion,
    }))
  })

  it('requires publish for published reads and draft for Preview reads', () => {
    const draft = makeSiteAEditorialHomepageNode()
    setField(draft, 'status', 'draft')
    expect(() => adapt(draft)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'identity.status',
    }))

    const published = makeSiteAEditorialHomepageNode()
    expect(() => toSiteAEditorialHomepageDto(published, {
      readMode: 'preview',
      rfqHref,
    })).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'identity.status',
    }))
  })

  it.each([
    ['hero HTML', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(fields(node), 'heroHeading', '<script>alert(1)</script>'), 'hero.heading'],
    ['editorial HTML', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(editorial(node), 'directAnswerBody', '<b>unsafe</b>'), 'directAnswer.body'],
    ['overlong header RFQ label', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(editorial(node), 'headerRfqLabel', 'x'.repeat(33)), 'headerRfq.label'],
    ['overlong FAQ question', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(editorial(node).geoFaqs![0] as object, 'faqQuestion', 'x'.repeat(161)), 'faq.items[0].question'],
    ['overlong secondary topic', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => setField(fields(node).secondaryTopics![0] as object, 'secondaryTopic', 'x'.repeat(81)), 'seo.secondaryTopics[0]'],
  ])('rejects %s', (_label, mutate, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    mutate(node)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    ['decisionQuestions', 'decisionQuestions', 0, 13],
    ['applicationBriefs', 'applicationBriefs', 0, 13],
    ['supplyRoutes', 'supplyRoutes', 0, 7],
    ['evidenceItems', 'evidenceItems', -1, 13],
    ['evaluationSteps', 'evaluationSteps', 0, 11],
    ['faq.items', 'geoFaqs', 2, 21],
    ['glossary', 'glossaryItems', -1, 31],
  ])('enforces the exact %s row bounds', (fieldPath, key, belowMin, aboveMax) => {
    if (belowMin >= 0) {
      const node = makeSiteAEditorialHomepageNode()
      setField(editorial(node), key, Array.from({length: belowMin}))
      expect(() => adapt(node)).toThrow(expect.objectContaining({
        name: HomepageContractError.name,
        fieldPath,
      }))
    }

    const node = makeSiteAEditorialHomepageNode()
    const existing = editorial(node)[key as keyof ReturnType<typeof editorial>] as readonly unknown[]
    setField(editorial(node), key, Array.from({length: aboveMax}, (_, index) => existing[index % existing.length]))
    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    ['decision number', 'decisionNumber', 'decisionQuestions[1].number'],
    ['decision question', 'decisionQuestion', 'decisionQuestions[1].question'],
  ])('rejects a duplicate %s', (_label, key, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    const rows = editorial(node).decisionQuestions!
    setField(rows[1] as object, key, Reflect.get(rows[0] as object, key))

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    [
      'decision number',
      'decisionNumber',
      'Step 01',
      ' step\u008501 ',
      'decisionQuestions[1].number',
    ],
    [
      'decision question',
      'decisionQuestion',
      'Which route?',
      ' WHICH\tROUTE? ',
      'decisionQuestions[1].question',
    ],
  ])(
    'rejects a case/whitespace-normalized duplicate %s',
    (_label, key, firstValue, duplicateValue, fieldPath) => {
      const node = makeSiteAEditorialHomepageNode()
      const rows = editorial(node).decisionQuestions!
      setField(rows[0] as object, key, firstValue)
      setField(rows[1] as object, key, duplicateValue)

      expect(() => adapt(node)).toThrow(expect.objectContaining({
        name: HomepageContractError.name,
        fieldPath,
      }))
    },
  )

  it.each([
    ['FAQ question', 'geoFaqs', 'faqQuestion', 'faq.items[1].question'],
    ['glossary term', 'glossaryItems', 'term', 'glossary[1].term'],
    ['secondary topic', 'secondaryTopics', 'secondaryTopic', 'seo.secondaryTopics[1]'],
  ])('rejects a duplicate %s case-insensitively', (_label, collection, key, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    const parent = collection === 'secondaryTopics' ? fields(node) : editorial(node)
    const rows = Reflect.get(parent, collection) as readonly object[]
    setField(rows[1], key, String(Reflect.get(rows[0], key)).toUpperCase())

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    ['wrong format', '2026-08-26'],
    ['impossible date', '2026-02-30T00:00:00.000Z'],
    ['missing milliseconds', '2026-08-26T00:00:00Z'],
  ])('rejects a %s editorial review instant', (_label, value) => {
    const node = makeSiteAEditorialHomepageNode()
    setField(editorial(node), 'editorialReviewedAt', value)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'editorial.reviewedAt',
    }))
  })

  it('rejects non-HTTPS and credentialed evidence URLs', () => {
    for (const evidenceUrl of [
      'https://@example.test/evidence',
      'https://:@example.test/evidence',
      'http://example.test/evidence',
      'HTTPS://example.test/evidence',
      'https://user:pass@example.test/evidence',
    ]) {
      const node = makeSiteAEditorialHomepageNode()
      setField(editorial(node).supplyRoutes![0] as object, 'evidenceUrl', evidenceUrl)
      expect(() => adapt(node)).toThrow(expect.objectContaining({
        name: HomepageContractError.name,
        fieldPath: 'supplyRoutes[0].evidenceUrl',
      }))
    }
  })

  it.each([
    [
      'literal product root from a supply route',
      'supplyRoutes',
      'https://example.test/products',
      'supplyRoutes[0].evidenceUrl',
    ],
    [
      'normalized product root from a supply route',
      'supplyRoutes',
      'https://example.test/review/../products',
      'supplyRoutes[0].evidenceUrl',
    ],
    [
      'encoded product descendant from a supply route',
      'supplyRoutes',
      'https://example.test/%70roducts/rutile',
      'supplyRoutes[0].evidenceUrl',
    ],
    [
      'normalized application root from an evidence item',
      'evidenceItems',
      'https://example.test/review/../applications',
      'evidenceItems[0].evidenceUrl',
    ],
    [
      'encoded application descendant from an evidence item',
      'evidenceItems',
      'https://example.test/applications%2Fcoatings',
      'evidenceItems[0].evidenceUrl',
    ],
    [
      'literal application descendant from an evidence item',
      'evidenceItems',
      'https://example.test/applications/coatings',
      'evidenceItems[0].evidenceUrl',
    ],
  ])('rejects a %s', (_label, collection, evidenceUrl, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    const rows = Reflect.get(editorial(node), collection) as readonly object[]
    setField(rows[0]!, 'evidenceUrl', evidenceUrl)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    [
      'forbidden-route supply URL',
      'supplyRoutes',
      'https://example.test/products\\rutile',
      'supplyRoutes[0].evidenceUrl',
    ],
    [
      'allowed-looking supply URL',
      'supplyRoutes',
      'https://example.test/evidence\\supply-route.pdf',
      'supplyRoutes[0].evidenceUrl',
    ],
    [
      'forbidden-route evidence-item URL',
      'evidenceItems',
      'https://example.test/applications\\coatings',
      'evidenceItems[0].evidenceUrl',
    ],
    [
      'allowed-looking evidence-item URL',
      'evidenceItems',
      'https://example.test/evidence\\source-document.pdf',
      'evidenceItems[0].evidenceUrl',
    ],
  ])('rejects a raw backslash in the %s', (_label, collection, evidenceUrl, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    const rows = Reflect.get(editorial(node), collection) as readonly object[]
    setField(rows[0]!, 'evidenceUrl', evidenceUrl)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it('retains HTTPS evidence documents outside forbidden Homepage routes', () => {
    const node = makeSiteAEditorialHomepageNode()
    setField(
      editorial(node).supplyRoutes![0] as object,
      'evidenceUrl',
      'https://example.test/documents/products-route.pdf',
    )
    setField(
      editorial(node).evidenceItems![0] as object,
      'evidenceUrl',
      'https://example.test/evidence/applications-review.pdf',
    )

    const dto = adapt(node)
    expect(dto.supplyRoutes[0]?.evidenceUrl).toBe(
      'https://example.test/documents/products-route.pdf',
    )
    expect(dto.evidenceItems[0]?.evidenceUrl).toBe(
      'https://example.test/evidence/applications-review.pdf',
    )
  })

  it('ignores product/application text outside the evidence pathname', () => {
    const node = makeSiteAEditorialHomepageNode()
    const evidenceUrl =
      'https://example.test/evidence?next=/products#applications'
    setField(
      editorial(node).supplyRoutes![0] as object,
      'evidenceUrl',
      evidenceUrl,
    )
    setField(
      editorial(node).evidenceItems![0] as object,
      'evidenceUrl',
      evidenceUrl,
    )

    expect(adapt(node).supplyRoutes[0]?.evidenceUrl).toBe(evidenceUrl)
    expect(adapt(node).evidenceItems[0]?.evidenceUrl).toBe(evidenceUrl)
  })

  it.each([
    [
      'the safe local default',
      undefined,
      'http://localhost:8080/wp-content/uploads/2026/08/hero.webp',
    ],
    [
      'an explicit production WordPress origin',
      'https://cms.example.test:8443',
      'https://cms.example.test:8443/wp-content/uploads/2026/08/hero.webp',
    ],
  ])('accepts Site A media from %s', (_label, mediaOrigin, src) => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', mediaOrigin)
    const node = makeSiteAEditorialHomepageNode()
    setHeroImage(node, src)
    setField(fields(node), 'ogImage', mediaEdge(src, 'Synthetic Open Graph image'))

    expect(adapt(node).hero.image?.src).toBe(src)
    expect(adapt(node).seo.ogImage?.src).toBe(src)
  })

  it.each([
    ['protocol', 'http://cms.example.test:8443/wp-content/uploads/hero.webp'],
    ['host', 'https://media.example.test:8443/wp-content/uploads/hero.webp'],
    ['port', 'https://cms.example.test/wp-content/uploads/hero.webp'],
    ['uploads path', 'https://cms.example.test:8443/assets/hero.webp'],
    ['credentials', 'https://user:pass@cms.example.test:8443/wp-content/uploads/hero.webp'],
    ['an empty userinfo marker', 'https://@cms.example.test:8443/wp-content/uploads/hero.webp'],
  ])('rejects a Site A media URL with mismatched %s', (_label, src) => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', 'https://cms.example.test:8443')
    const node = makeSiteAEditorialHomepageNode()
    setHeroImage(node, src)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'hero.image.src',
    }))
  })

  it('applies the Site A media policy to Open Graph images', () => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', 'https://cms.example.test')
    const node = makeSiteAEditorialHomepageNode()
    setField(
      fields(node),
      'ogImage',
      mediaEdge('https://other.example.test/wp-content/uploads/og.webp'),
    )

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'seo.ogImage.src',
    }))
  })

  it.each([
    ['optional evidence rows', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(editorial(node), 'evidenceItems'), 'evidenceItems'],
    ['optional glossary rows', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(editorial(node), 'glossaryItems'), 'glossary'],
    ['optional secondary-topic rows', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(fields(node), 'secondaryTopics'), 'seo.secondaryTopics'],
    ['nullable Hero image', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(fields(node), 'heroImage'), 'hero.image'],
    ['optional evidence URL', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(editorial(node).evidenceItems![0] as object, 'evidenceUrl'), 'evidenceItems[0].evidenceUrl'],
    ['optional revision label', (node: ReturnType<typeof makeSiteAEditorialHomepageNode>) => Reflect.deleteProperty(editorial(node).evidenceItems![0] as object, 'revisionLabel'), 'evidenceItems[0].revisionLabel'],
  ])('rejects an omitted %s instead of coercing wrong-shape data', (_label, mutate, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    mutate(node)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it.each([
    ['invalid claim basis', 'supplyRoutes', 'claimBasis', ['unknown'], 'supplyRoutes[0].claimBasis'],
    ['scalar published claim basis', 'supplyRoutes', 'claimBasis', 'synthetic_demo', 'supplyRoutes[0].claimBasis'],
    ['multiple published verification statuses', 'evidenceItems', 'verificationStatus', ['demo', 'verified'], 'evidenceItems[0].verificationStatus'],
    ['invalid verification status', 'evidenceItems', 'verificationStatus', ['unknown'], 'evidenceItems[0].verificationStatus'],
  ])('rejects %s', (_label, collection, key, value, fieldPath) => {
    const node = makeSiteAEditorialHomepageNode()
    const rows = Reflect.get(editorial(node), collection) as readonly object[]
    setField(rows[0], key, value)

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath,
    }))
  })

  it('requires evidence for source-document and verified rows', () => {
    const sourceDocument = makeSiteAEditorialHomepageNode()
    setField(editorial(sourceDocument).supplyRoutes![0] as object, 'claimBasis', ['source_document'])
    expect(() => adapt(sourceDocument)).toThrow(expect.objectContaining({
      fieldPath: 'supplyRoutes[0].evidenceUrl',
    }))

    const verified = makeSiteAEditorialHomepageNode()
    setField(editorial(verified).evidenceItems![0] as object, 'verificationStatus', ['verified'])
    expect(() => adapt(verified)).toThrow(expect.objectContaining({
      fieldPath: 'evidenceItems[0].evidenceUrl',
    }))
  })

  it('requires complete review metadata for verified evidence', () => {
    const node = makeSiteAEditorialHomepageNode()
    setField(editorial(node).evidenceItems![0] as object, 'verificationStatus', ['verified'])
    setField(editorial(node).evidenceItems![0] as object, 'evidenceUrl', 'https://example.test/evidence')
    setField(editorial(node), 'editorialReviewedBy', '')

    expect(() => adapt(node)).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'editorial.reviewedBy',
    }))
  })

  it('rejects unsafe RFQ targets supplied outside the Git site configuration', () => {
    expect(() => toSiteAEditorialHomepageDto(makeSiteAEditorialHomepageNode(), {
      rfqHref: 'javascript:alert(1)',
    })).toThrow(expect.objectContaining({
      name: HomepageContractError.name,
      fieldPath: 'headerRfq.href',
    }))
  })
})
