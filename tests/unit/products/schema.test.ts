import {describe, expect, it} from 'vitest'

import {productPageInputSchema} from '@/lib/products/schema'
import {validProductPageInput} from '@/tests/fixtures/product-page'

const fixture = () => structuredClone(validProductPageInput)

describe('Product render contract schema', () => {
  it('accepts the complete Product fixture', () => {
    expect(productPageInputSchema.safeParse(fixture()).success).toBe(true)
  })

  it.each([
    ['TP-z911', 'tp-z911', '/products/tp-z911'],
    ['TP-Z91', 'tp-z91', '/products/tp-z91'],
    ['TP-ZZZ911', 'tp-zzz911', '/products/tp-zzz911'],
  ])('rejects non-canonical Product ID %s', (productId, slug, path) => {
    const input = fixture()
    Object.assign(input.identity, {productId, slug, path})

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('requires the slug and path to be derived from the exact Product ID', () => {
    const wrongSlug = fixture()
    wrongSlug.identity.slug = 'tp-z912'
    const wrongPath = fixture()
    wrongPath.identity.path = '/products/tp-z912'

    expect(productPageInputSchema.safeParse(wrongSlug).success).toBe(false)
    expect(productPageInputSchema.safeParse(wrongPath).success).toBe(false)
  })

  it('rejects missing or whitespace-only required strings', () => {
    const missingTitle = fixture() as Record<string, unknown>
    delete (missingTitle.identity as Record<string, unknown>).title
    const blankUnit = fixture()
    blankUnit.typicalProperties[0].unit = '   '

    expect(productPageInputSchema.safeParse(missingTitle).success).toBe(false)
    expect(productPageInputSchema.safeParse(blankUnit).success).toBe(false)
  })

  it.each([
    ['thirty-nine words', 39],
    ['seventy-one words', 71],
  ])('rejects a %s Quick Answer', (_label, count) => {
    const input = fixture()
    input.hero.quickAnswer = `<p>${Array.from({length: count}, (_, index) => `word${index + 1}`).join(' ')}</p>`

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    ['fitWhen', 'selection', 'fitWhen', 2],
    ['fitWhen', 'selection', 'fitWhen', 6],
    ['discussFirstWhen', 'selection', 'discussFirstWhen', 0],
    ['performancePriorities', null, 'performancePriorities', 2],
    ['performancePriorities', null, 'performancePriorities', 7],
  ])('enforces the %s list bounds', (_label, parent, key, count) => {
    const input = fixture() as Record<string, unknown>
    const container = parent
      ? input[parent] as Record<string, unknown>
      : input
    const current = container[key] as unknown[]
    container[key] = Array.from({length: count}, (_, index) => current[index % current.length])

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([5, 11])('rejects %i FAQs', (count) => {
    const input = fixture()
    input.faqs = Array.from(
      {length: count},
      (_, index) => input.faqs[index % input.faqs.length],
    )

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    'https://tracker.example/products/tp-z912',
    '//tracker.example/products/tp-z912',
    'javascript:alert(1)',
    '/products/tp-z912?utm_source=partner',
    '/products/../private',
  ])('rejects unsafe or non-canonical relationship URL %s', (href) => {
    const input = fixture()
    input.relatedLinks.products[0].href = href

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    ['tdsUrl', 'https://private.example.test/tds/TP-Z911.pdf'],
    ['manufacturer', 'Example Legal Co.'],
    ['legalEntity', 'Example Legal Co. Ltd.'],
    ['sourceFile', 'private-source.pdf'],
    ['reviewer', 'Private Person'],
  ])('rejects the forbidden field %s instead of silently dropping it', (key, value) => {
    const input = fixture() as Record<string, unknown>
    input[key] = value

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    'Download https://private.example.test/tds/TP-Z911.pdf',
    'Download /resources/tds/tp-z911.pdf',
  ])('rejects a direct TDS location embedded in request-only copy', (tdsAccess) => {
    const input = fixture()
    input.tdsAccess = tdsAccess

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it.each([
    ['SEO copy', (input: ReturnType<typeof fixture>) => {
      input.seo.description = 'Read https://private.example.test/files/TP-Z911.pdf before evaluation.'
    }],
    ['plain copy', (input: ReturnType<typeof fixture>) => {
      input.snapshot.positioning = 'Internal source: D:\\11SEO\\documents\\tds\\TP-Z911.pdf.'
    }],
    ['punctuation-adjacent TDS path', (input: ReturnType<typeof fixture>) => {
      input.performancePriorities[0].explanation = 'Use the current (/tds/tp-z911) source.'
    }],
    ['recommended Application copy', (input: ReturnType<typeof fixture>) => {
      input.recommendedApplications[0].fit = 'See private-source.pdf for the evaluation boundary.'
    }],
    ['recommended Application href', (input: ReturnType<typeof fixture>) => {
      input.recommendedApplications[0].href = '/documents/tds/tp-z911'
    }],
    ['rich-text anchor href', (input: ReturnType<typeof fixture>) => {
      input.evidenceHtml = '<p>Read the <a href="/tds/tp-z911.pdf">private sheet</a>.</p>'
    }],
    ['rich-text anchor attribute', (input: ReturnType<typeof fixture>) => {
      input.faqs[0].answerHtml = '<p><a href="/resources/testing" title="D:\\private\\TP-Z911.pdf">Testing</a></p>'
    }],
    ['entity-encoded rich text', (input: ReturnType<typeof fixture>) => {
      input.evidenceHtml = '<p>Internal source: &#47;tds&#47;tp-z911.</p>'
    }],
    ['CTA copy', (input: ReturnType<typeof fixture>) => {
      input.ctas.requestTds.description = 'Request file:///D:/documents/tds/TP-Z911.pdf.'
    }],
    ['related href', (input: ReturnType<typeof fixture>) => {
      input.relatedLinks.resources[0].href = '/documents/tds/tp-z911.pdf'
    }],
    ['disclaimer rich text', (input: ReturnType<typeof fixture>) => {
      input.disclaimerHtml = '<p>Controlled source: /tds/tp-z911.</p>'
    }],
  ] as const)('rejects a private document location in %s', (_label, mutate) => {
    const input = fixture()
    mutate(input)

    expect(productPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('continues to allow ordinary canonical internal links', () => {
    const input = fixture()
    input.evidenceHtml = '<p>Use the <a href="/resources/tds-request-guide">TDS request guide</a>.</p>'
    input.relatedLinks.resources[0].href = '/resources/tds-request-guide'

    expect(productPageInputSchema.safeParse(input).success).toBe(true)
  })
})
