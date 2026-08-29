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
type LooseCta = {
  kind: 'discuss-application' | 'request-tds' | 'request-sample'
  label: string
}
type LooseTarget = {
  type: 'application' | 'product' | 'resource'
  id: string
}
type LooseDetailPage = {
  hero: {ctas: LooseCta[]}
  enquiryPreparation: {ctas: LooseCta[]}
  finalCtas: LooseCta[]
  applicationContext: {application: LooseTarget}
  relatedLinks: {
    products: LooseTarget[]
    resources: LooseTarget[]
    family: LooseTarget
  }
}
type LooseHubPage = {
  enquiry: {ctas: LooseCta[]}
  applicationBoundary: {link: LooseTarget}
  resources: LooseTarget[]
}
type LooseFamilyPage = {
  enquiry: {ctas: LooseCta[]}
  applications: LooseTarget[]
  resources: LooseTarget[]
}

const APPROVED_COATINGS_ROWS = [
  {
    productId: 'TP-C050',
    cardSummary: 'Electrophoretic primers, industrial electrophoretic coatings and general interior coatings',
    applicationFocus: 'Electrophoretic primers and coating systems; interior, industrial and powder coatings',
    performanceFocus: 'Low ion content, electrical resistivity, whiteness, gloss, hiding power',
    surfaceTreatmentPositioning: 'Specially treated · Electrophoretic & General Coatings',
    filterTags: ['specialty'],
  },
  {
    productId: 'TP-C100',
    cardSummary: 'General-purpose architectural, industrial and decorative coatings',
    applicationFocus: 'Interior and exterior flat and semi-gloss architectural; industrial and decorative coatings',
    performanceFocus: 'Neutral tint, hiding power, whiteness, durability',
    surfaceTreatmentPositioning: 'General-purpose · Solvent and water-based systems',
    filterTags: ['water', 'architectural'],
  },
  {
    productId: 'TP-C110',
    cardSummary: 'Multi-purpose architectural, industrial and decorative coatings',
    applicationFocus: 'Interior and exterior flat and semi-gloss architectural; industrial and decorative coatings',
    performanceFocus: 'Neutral tint, hiding power, whiteness, durability',
    surfaceTreatmentPositioning: 'Multi-purpose · Solvent and water-based systems',
    filterTags: ['water', 'architectural'],
  },
  {
    productId: 'TP-C120',
    cardSummary: 'Water-based interior and exterior wall emulsion paints',
    applicationFocus: 'Water-based interior and exterior wall emulsion paints',
    performanceFocus: 'Relatively low viscosity, bluish tone, high gloss, high hiding power, high durability',
    surfaceTreatmentPositioning: 'Zirconium-aluminum and special organic surface treatment · TIOVAR Premium positioning',
    filterTags: ['water', 'architectural'],
  },
  {
    productId: 'TP-C200',
    cardSummary: 'High-PVC interior and exterior matte or flat architectural coatings',
    applicationFocus: 'Interior and exterior high-PVC matte or flat architectural coatings, including systems above CPVC',
    performanceFocus: 'Ultra-high dry hiding power, weather resistance, water dispersibility, oil absorption',
    surfaceTreatmentPositioning: 'Special surface treatment · High-PVC Architectural Coatings',
    filterTags: ['water', 'architectural'],
  },
  {
    productId: 'TP-C300',
    cardSummary: 'Automotive OEM/refinishing, marine, aerospace and exterior coatings',
    applicationFocus: 'Automotive OEM/refinishing, marine, aerospace, exterior, architectural, coil and powder coatings',
    performanceFocus: 'High durability, high gloss, high hiding power, weather resistance, dispersibility',
    surfaceTreatmentPositioning: 'Silicon-aluminum and special organic surface treatment · High-Durability Coatings',
    filterTags: ['automotive'],
  },
  {
    productId: 'TP-C310',
    cardSummary: 'Water-based automotive, water-soluble resin industrial and exterior coatings',
    applicationFocus: 'Water-based automotive, water-soluble resin industrial and exterior coatings',
    performanceFocus: 'Water dispersibility, storage stability, weather resistance, chalk resistance',
    surfaceTreatmentPositioning: 'Special surface treatment · Waterborne Coatings',
    filterTags: ['water', 'automotive'],
  },
  {
    productId: 'TP-C400',
    cardSummary: 'Automotive OEM/refinishing, marine, aerospace, exterior and industrial coatings',
    applicationFocus: 'Automotive OEM/refinishing, marine, aerospace, exterior and industrial coatings',
    performanceFocus: 'Ultra-high weather resistance, chalk resistance, color retention, gloss, hiding power',
    surfaceTreatmentPositioning: 'Special inorganic and organic surface treatment · Ultra-High Weatherability Coatings',
    filterTags: ['automotive'],
  },
  {
    productId: 'TP-C410',
    cardSummary: 'Automotive, wind-power, marine, heavy anti-corrosion, coil and powder coatings',
    applicationFocus: 'Automotive, wind-power, marine, aerospace, heavy anti-corrosion, coil and powder coatings',
    performanceFocus: 'Extremely high weather resistance, chalk resistance, color retention, gloss, hiding power',
    surfaceTreatmentPositioning: 'Special inorganic and organic surface treatment · Extremely High Weather Resistance Coatings',
    filterTags: ['automotive'],
  },
] as const

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

    const visibleRows = coatingsFamilyPageInput.products.map((product) => ({
      productId: product.productId,
      cardSummary: product.cardSummary,
      applicationFocus: product.applicationFocus,
      performanceFocus: product.performanceFocus,
      surfaceTreatmentPositioning: product.surfaceTreatmentPositioning,
      filterTags: product.filterTags,
    }))
    expect(visibleRows).toEqual(APPROVED_COATINGS_ROWS)
    expect(
      coatingsFamilyPageInput.comparison.products.map((product) => ({
        productId: product.productId,
        cardSummary: product.cardSummary,
        applicationFocus: product.applicationFocus,
        performanceFocus: product.performanceFocus,
        surfaceTreatmentPositioning: product.surfaceTreatmentPositioning,
        filterTags: product.filterTags,
      })),
    ).toEqual(APPROVED_COATINGS_ROWS)

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

  it('rejects predictable internal TDS download paths in plain text and rich text', () => {
    const plainText = clone(tpC120ProductPageInput)
    plainText.technicalNote = 'Download the TDS from /downloads/tp-c120'
    expect(productDetailPageInputSchema.safeParse(plainText).success).toBe(false)

    const richText = clone(tpC120ProductPageInput)
    richText.hero.directAnswer = '<p><a href="/downloads/tp-c120">Download the TDS</a></p>'
    expect(productDetailPageInputSchema.safeParse(richText).success).toBe(false)
  })

  it('locks CTA labels to kind and each approved group to its exact order', () => {
    const wrongLabel = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongLabel.finalCtas[0]!.label = 'Download the TDS'
    expect(productDetailPageInputSchema.safeParse(wrongLabel).success).toBe(false)

    const missing = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    missing.hero.ctas.pop()
    expect(productDetailPageInputSchema.safeParse(missing).success).toBe(false)

    const duplicate = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    duplicate.hero.ctas = [
      {kind: 'request-tds', label: 'Request a TDS'},
      {kind: 'request-tds', label: 'Request a TDS'},
    ]
    expect(productDetailPageInputSchema.safeParse(duplicate).success).toBe(false)

    const wrongOrder = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongOrder.hero.ctas.reverse()
    expect(productDetailPageInputSchema.safeParse(wrongOrder).success).toBe(false)

    const wrongStage = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongStage.hero.ctas[1] = {
      kind: 'request-sample',
      label: 'Request a Sample',
    }
    expect(productDetailPageInputSchema.safeParse(wrongStage).success).toBe(false)

    const wrongHubStage = clone(productsHubPageInput) as unknown as LooseHubPage
    wrongHubStage.enquiry.ctas = [
      {kind: 'request-tds', label: 'Request a TDS'},
      {kind: 'discuss-application', label: 'Discuss Your Application'},
    ]
    expect(productsHubPageInputSchema.safeParse(wrongHubStage).success).toBe(false)

    const wrongFamilyStage = clone(coatingsFamilyPageInput) as unknown as LooseFamilyPage
    wrongFamilyStage.enquiry.ctas.push({
      kind: 'request-sample',
      label: 'Request a Sample',
    })
    expect(productFamilyPageInputSchema.safeParse(wrongFamilyStage).success).toBe(false)

    const wrongEnquiryOrder = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongEnquiryOrder.enquiryPreparation.ctas.reverse()
    expect(productDetailPageInputSchema.safeParse(wrongEnquiryOrder).success).toBe(false)

    const wrongFinalStage = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongFinalStage.finalCtas.push({
      kind: 'request-sample',
      label: 'Request a Sample',
    })
    expect(productDetailPageInputSchema.safeParse(wrongFinalStage).success).toBe(false)
  })

  it('rejects the wrong editorial target type in every semantic relationship bucket', () => {
    const wrongHubBoundary = clone(productsHubPageInput) as unknown as LooseHubPage
    wrongHubBoundary.applicationBoundary.link = {type: 'resource', id: 'article-03'}
    expect(productsHubPageInputSchema.safeParse(wrongHubBoundary).success).toBe(false)

    const wrongHubResource = clone(productsHubPageInput) as unknown as LooseHubPage
    wrongHubResource.resources[0] = {type: 'application', id: 'coatings'}
    expect(productsHubPageInputSchema.safeParse(wrongHubResource).success).toBe(false)

    const wrongFamilyApplication = clone(coatingsFamilyPageInput) as unknown as LooseFamilyPage
    wrongFamilyApplication.applications[0] = {type: 'resource', id: 'article-03'}
    expect(productFamilyPageInputSchema.safeParse(wrongFamilyApplication).success).toBe(false)

    const wrongFamilyResource = clone(coatingsFamilyPageInput) as unknown as LooseFamilyPage
    wrongFamilyResource.resources[0] = {type: 'application', id: 'coatings'}
    expect(productFamilyPageInputSchema.safeParse(wrongFamilyResource).success).toBe(false)

    const wrongContext = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongContext.applicationContext.application = {type: 'resource', id: 'article-03'}
    expect(productDetailPageInputSchema.safeParse(wrongContext).success).toBe(false)

    const wrongRelatedProduct = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongRelatedProduct.relatedLinks.products[0] = {type: 'resource', id: 'article-03'}
    expect(productDetailPageInputSchema.safeParse(wrongRelatedProduct).success).toBe(false)

    const wrongRelatedResource = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongRelatedResource.relatedLinks.resources[0] = {type: 'application', id: 'coatings'}
    expect(productDetailPageInputSchema.safeParse(wrongRelatedResource).success).toBe(false)

    const wrongFamilyReturn = clone(tpC120ProductPageInput) as unknown as LooseDetailPage
    wrongFamilyReturn.relatedLinks.family = {type: 'resource', id: 'article-03'}
    expect(productDetailPageInputSchema.safeParse(wrongFamilyReturn).success).toBe(false)
  })

  it('rejects unsafe rich text instead of admitting a partial sanitized page', () => {
    const input = clone(productsHubPageInput)
    input.hero.directAnswer = '<p onclick="track()">Useful text.</p><script>alert(1)</script>'
    expect(productsHubPageInputSchema.safeParse(input).success).toBe(false)
  })
})
