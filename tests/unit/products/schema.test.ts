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
})
