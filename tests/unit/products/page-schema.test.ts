import {describe, expect, it} from 'vitest'

import {
  productDetailPageInputSchema,
  productExperiencePageInputSchema,
  productFamilyPageInputSchema,
  productsHubPageInputSchema,
  siteAProductRepresentativeFixtureSchema,
} from '@/lib/products/page-schema'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  siteAProductRepresentativeFixture,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'

const clone = <T>(value: T): T => structuredClone(value)

describe('three-level Product page schemas', () => {
  it('accepts exactly the approved Hub, Coatings, and TP-C120 records', () => {
    expect(
      siteAProductRepresentativeFixtureSchema.safeParse(
        siteAProductRepresentativeFixture,
      ).success,
    ).toBe(true)
    for (const record of siteAProductRepresentativeFixture.records) {
      expect(productExperiencePageInputSchema.safeParse(record).success).toBe(true)
    }
  })

  it('locks the representative fixture to the approved counts and distinctions', () => {
    expect(productsHubPageInput.families).toHaveLength(8)
    expect(productsHubPageInput.families.map(({count}) => count)).toEqual([
      9, 4, 4, 3, 2, 1, 1, 1,
    ])
    expect(productsHubPageInput.knownGrades).toHaveLength(25)

    const coatingsIds = [
      'TP-C050',
      'TP-C100',
      'TP-C110',
      'TP-C120',
      'TP-C200',
      'TP-C300',
      'TP-C310',
      'TP-C400',
      'TP-C410',
    ]
    expect(coatingsFamilyPageInput.products.map(({productId}) => productId)).toEqual(
      coatingsIds,
    )
    expect(
      coatingsFamilyPageInput.comparison.products.map(({productId}) => productId),
    ).toEqual(coatingsIds)
    expect(
      coatingsFamilyPageInput.comparison.products.map(
        ({surfaceTreatmentPositioning}) => surfaceTreatmentPositioning,
      ),
    ).toEqual([
      'Specially treated · Electrophoretic & General Coatings',
      'General-purpose · Solvent and water-based systems',
      'Multi-purpose · Solvent and water-based systems',
      'Zirconium-aluminum and special organic surface treatment · TIOVAR Premium positioning',
      'Special surface treatment · High-PVC Architectural Coatings',
      'Silicon-aluminum and special organic surface treatment · High-Durability Coatings',
      'Special surface treatment · Waterborne Coatings',
      'Special inorganic and organic surface treatment · Ultra-High Weatherability Coatings',
      'Special inorganic and organic surface treatment · Extremely High Weather Resistance Coatings',
    ])

    expect(tpC120ProductPageInput.technicalProperties).toHaveLength(9)
    expect(tpC120ProductPageInput.formulationPriorities).toHaveLength(5)
    expect(tpC120ProductPageInput.validationSteps).toHaveLength(6)
    expect(tpC120ProductPageInput.faqs).toHaveLength(6)
    expect(tpC120ProductPageInput.technicalProperties.map(({unit}) => unit)).toEqual([
      '%',
      '%',
      '',
      '',
      'g/cm3',
      '',
      '',
      'g/100 g',
      'micrometres',
    ])
  })

  it('contains no private document, download, or commercial leakage', () => {
    const fixtureText = JSON.stringify(siteAProductRepresentativeFixture)
    expect(fixtureText).not.toMatch(
      /(?:\.pdf|\/documents\/tds|[a-z]:\\|file:\/\/|https?:\/\/|\b(?:supplier|manufacturer|producer|factory|legal entity|price|stock|moq)\b)/iu,
    )
    expect(fixtureText).not.toMatch(/"href"/u)
  })

  it('rejects an unknown page level and a partial required section', () => {
    const unknown = clone(productsHubPageInput) as Record<string, unknown>
    unknown.level = 'landing'
    expect(productExperiencePageInputSchema.safeParse(unknown).success).toBe(false)

    const partial = clone(tpC120ProductPageInput) as Record<string, unknown>
    delete partial.enquiryPreparation
    expect(productDetailPageInputSchema.safeParse(partial).success).toBe(false)
  })

  it('rejects Hub family or known-grade count and membership drift', () => {
    const missingFamily = clone(productsHubPageInput)
    missingFamily.families.pop()
    expect(productsHubPageInputSchema.safeParse(missingFamily).success).toBe(false)

    const missingGrade = clone(productsHubPageInput)
    missingGrade.knownGrades.pop()
    expect(productsHubPageInputSchema.safeParse(missingGrade).success).toBe(false)

    const wrongGrade = clone(productsHubPageInput)
    wrongGrade.knownGrades[0]!.productId = 'TP-X999'
    expect(productsHubPageInputSchema.safeParse(wrongGrade).success).toBe(false)
  })

  it('rejects Coatings membership, duplicate order, unknown tags, and a wrong path', () => {
    const wrongSet = clone(coatingsFamilyPageInput)
    wrongSet.products[0]!.productId = 'TP-P100'
    expect(productFamilyPageInputSchema.safeParse(wrongSet).success).toBe(false)

    const duplicateOrder = clone(coatingsFamilyPageInput)
    duplicateOrder.products[1]!.displayOrder = 1
    expect(productFamilyPageInputSchema.safeParse(duplicateOrder).success).toBe(false)

    const unknownTag = clone(coatingsFamilyPageInput)
    unknownTag.products[0]!.filterTags = ['best']
    expect(productFamilyPageInputSchema.safeParse(unknownTag).success).toBe(false)

    const wrongPath = clone(coatingsFamilyPageInput)
    wrongPath.identity.path = '/products/plastics-masterbatch'
    expect(productFamilyPageInputSchema.safeParse(wrongPath).success).toBe(false)
  })

  it('rejects any reordered or modified TP-C120 technical property', () => {
    const reordered = clone(tpC120ProductPageInput)
    ;[reordered.technicalProperties[0], reordered.technicalProperties[1]] = [
      reordered.technicalProperties[1]!,
      reordered.technicalProperties[0]!,
    ]
    expect(productDetailPageInputSchema.safeParse(reordered).success).toBe(false)

    const modified = clone(tpC120ProductPageInput)
    modified.technicalProperties[4]!.unit = 'kg/m3'
    expect(productDetailPageInputSchema.safeParse(modified).success).toBe(false)
  })

  it.each([
    'https://example.test/tp-c120-tds',
    '/documents/tds/tp-c120',
    'C:\\private\\tp-c120.pdf',
    'tp-c120.pdf',
    'supplier model X',
    'manufacturer Example Corp',
    'legal entity Example Corp',
    'price is 10',
    'stock is available',
    'MOQ is 1 tonne',
  ])('rejects Product content leakage: %s', (unsafe) => {
    const input = clone(tpC120ProductPageInput)
    input.technicalNote = unsafe
    expect(productDetailPageInputSchema.safeParse(input).success).toBe(false)
  })

  it('rejects unsafe rich text instead of admitting a partial sanitized page', () => {
    const input = clone(productsHubPageInput)
    input.hero.directAnswer = '<p onclick="track()">Useful text.</p><script>alert(1)</script>'
    expect(productsHubPageInputSchema.safeParse(input).success).toBe(false)
  })
})
