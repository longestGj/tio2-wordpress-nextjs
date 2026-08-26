import {describe, expect, it} from 'vitest'

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

  it('rejects wrong schema versions without legacy fallback', () => {
    const node = makeSiteAEditorialHomepageNode()
    setField(fields(node), 'homepageSchemaVersion', 'homepage-v0.1')

    expect(() => adapt(node)).toThrow(HomepageVersionError)
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
