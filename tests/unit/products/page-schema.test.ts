import {describe, expect, it} from 'vitest'

import {
  productDetailPageInputSchema,
  productExperiencePageInputSchema,
  productFamilyPageInputSchema,
  productsHubPageInputSchema,
  siteAProductRepresentativeFixtureSchema,
  type ProductDetailPageInput,
} from '@/lib/products/page-schema'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  siteAProductRepresentativeFixture,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'

const clone = <T>(value: T): T => structuredClone(value)

const EXPECTED_TP_C120_PRIORITIES = [
  {title: 'Viscosity', explanation: 'Compare slurry and finished-paint viscosity in the intended formulation.'},
  {title: 'Hiding power', explanation: 'Measure wet and dry opacity at the target pigment loading and film thickness.'},
  {title: 'Bluish tone & whiteness', explanation: 'Compare dry L*, dry b*, CBU and visual color against the formulation target.'},
  {title: 'Gloss', explanation: 'Measure gloss after the selected dispersion, application and cure procedure.'},
  {title: 'Durability', explanation: 'Check scrub, washability and exterior exposure where required.'},
] as const

const EXPECTED_TP_C120_VALIDATION = [
  {index: '01', title: 'Define the formulation', description: 'Binder chemistry, PVC, solids, dispersant package, pigment loading and application method.'},
  {index: '02', title: 'Optimize dispersion', description: 'Compare viscosity across the agreed shear range and optimize dispersant demand first.'},
  {index: '03', title: 'Measure color and hiding', description: 'Wet and dry opacity, dry L*, dry b*, CBU and visual whiteness.'},
  {index: '04', title: 'Check stability', description: 'Grind quality, fineness, storage stability and application behavior.'},
  {index: '05', title: 'Validate the film', description: 'Gloss, scrub, washability and film appearance after the selected cure.'},
  {index: '06', title: 'Test exterior use', description: 'Run exterior exposure or accelerated weathering where required.'},
] as const

const EXPECTED_TP_C120_ENQUIRY_ITEMS = [
  'Binder chemistry and emulsion type',
  'PVC range and solids target',
  'Dispersant package and pigment loading',
  'Viscosity target and shear range',
  'Interior or exterior use',
  'Destination market and expected quantity',
] as const

const EXPECTED_TP_C120_FAQS = [
  {question: 'What is TIOVAR TP‑C120?', answerHtml: '<p>TP‑C120 is a TIOVAR premium-positioned, chloride-process rutile titanium dioxide pigment intended for water-based interior and exterior wall emulsion paints.</p>'},
  {question: 'What coating applications is TP‑C120 intended for?', answerHtml: '<p>TP‑C120 is intended for water-based interior and exterior wall emulsion paints.</p>'},
  {question: 'What surface treatment does TP‑C120 use?', answerHtml: '<p>TP‑C120 uses zirconium-aluminum and special organic surface treatment.</p>'},
  {question: 'Is TP‑C120 suitable for interior and exterior wall paint?', answerHtml: '<p>TP‑C120 is intended for water-based interior and exterior wall emulsion paints. Final performance should be confirmed in the intended formulation.</p>'},
  {question: 'Which properties should be checked during formulation trials?', answerHtml: '<p>Check viscosity, dispersant demand, grind quality, hiding, dry color, gloss, storage stability, scrub, washability and exterior durability where required.</p>'},
  {question: 'How can I request a TDS or sample?', answerHtml: '<p>Include TP‑C120, the binder, PVC range, viscosity target, application and destination market with the enquiry.</p>'},
] as const

const EXPECTED_TP_C120_RELATED = {
  products: ['TP-C100', 'TP-C110', 'TP-C200'],
  resources: ['article-04', 'article-06'],
  family: 'coatings',
} as const

function expectDetailMutationRejected(
  mutate: (input: ProductDetailPageInput) => void,
): void {
  const input = clone(tpC120ProductPageInput)
  mutate(input)
  expect(productDetailPageInputSchema.safeParse(input).success).toBe(false)
}

function swapFirstTwo<T>(items: T[]): void {
  ;[items[0], items[1]] = [items[1]!, items[0]!]
}

const TP_C120_COMPLETENESS_MUTATIONS: ReadonlyArray<
  readonly [string, (input: ProductDetailPageInput) => void]
> = [
  ['delete priority', (input) => { input.formulationPriorities.pop() }],
  ['add priority', (input) => { input.formulationPriorities.push({title: 'Other priority', explanation: 'Other explanation.'}) }],
  ['reorder priorities', (input) => { swapFirstTwo(input.formulationPriorities) }],
  ['replace priority', (input) => { input.formulationPriorities[0] = {title: 'Other priority', explanation: 'Other explanation.'} }],
  ['delete validation step', (input) => { input.validationSteps.pop() }],
  ['add validation step', (input) => { input.validationSteps.push({index: '07', title: 'Other step', description: 'Other description.'}) }],
  ['reorder validation steps', (input) => { swapFirstTwo(input.validationSteps) }],
  ['replace validation step', (input) => { input.validationSteps[0] = {index: '07', title: 'Other step', description: 'Other description.'} }],
  ['delete enquiry item', (input) => { input.enquiryPreparation.items.pop() }],
  ['add enquiry item', (input) => { input.enquiryPreparation.items.push('Other input') }],
  ['reorder enquiry items', (input) => { swapFirstTwo(input.enquiryPreparation.items) }],
  ['replace enquiry item', (input) => { input.enquiryPreparation.items[0] = 'Other input' }],
  ['delete FAQ', (input) => { input.faqs.pop() }],
  ['add FAQ', (input) => { input.faqs.push({question: 'Other question?', answerHtml: '<p>Other answer.</p>'}) }],
  ['reorder FAQs', (input) => { swapFirstTwo(input.faqs) }],
  ['replace FAQ', (input) => { input.faqs[0] = {question: 'Other question?', answerHtml: '<p>Other answer.</p>'} }],
  ['delete related Product', (input) => { input.relatedLinks.products.pop() }],
  ['add related Product', (input) => { input.relatedLinks.products.push({type: 'product', id: 'TP-C300'}) }],
  ['reorder related Products', (input) => { swapFirstTwo(input.relatedLinks.products) }],
  ['replace related Product', (input) => { input.relatedLinks.products[0] = {type: 'product', id: 'TP-C300'} }],
  ['delete related Resource', (input) => { input.relatedLinks.resources.pop() }],
  ['add related Resource', (input) => { input.relatedLinks.resources.push({type: 'resource', id: 'article-03'}) }],
  ['reorder related Resources', (input) => { swapFirstTwo(input.relatedLinks.resources) }],
  ['replace related Resource', (input) => { input.relatedLinks.resources[0] = {type: 'resource', id: 'article-03'} }],
  ['replace Family return', (input) => { input.relatedLinks.family = {type: 'product', id: 'plastics-masterbatch'} }],
]
const APPROVED_HUB_PRESENTATION = {
  breadcrumb: {homeLabel: 'Home', currentLabel: 'Products'},
  hero: {
    imageAlt: 'Titanium dioxide products for industrial applications',
    familyActionLabel: 'Browse Product Families',
    enquiryAction: {
      kind: 'discuss-application',
      label: 'Discuss Your Application',
    },
  },
  families: {
    eyebrow: 'Product Families',
    heading: 'Start with the product family',
    intro:
      'Each family brings together titanium dioxide grades for a defined application and processing environment. Compare product positioning and technical focus before reviewing individual grades.',
    singularCountLabel: 'grade',
    pluralCountLabel: 'grades',
  },
  knownGrade: {
    eyebrow: 'Known Grade',
    heading: 'Already know the grade?',
    help: 'Search a TIOVAR grade to open the corresponding product page.',
    searchLabel: 'Find a TIOVAR grade',
    searchPlaceholder: 'Try TP-C120 or C120',
    noResults: 'No matching grade',
  },
  decisionPath: {
    eyebrow: 'Decision Path',
    heading: 'Move from product family to trial grade',
  },
  applicationBoundary: {
    eyebrow: 'Two Ways to Begin',
    heading: 'Choose the right starting point',
    intro:
      'Use Products to compare the TIOVAR portfolio or review a known grade. Use Applications when your starting point is a formulation, resin, process or finished-product requirement.',
  },
  resources: {
    eyebrow: 'Technical Resources',
    heading: 'Build a stronger comparison plan',
    cards: [
      {
        category: 'Selection',
        description:
          'See how pigment properties work together in an industrial formulation.',
      },
      {
        category: 'Treatment',
        description:
          'Connect surface treatment with dispersion, processing and finished-product performance.',
      },
      {
        category: 'Validation',
        description:
          'Plan a matched comparison using the formulation and test conditions that matter.',
      },
    ],
  },
  enquiryContextFields: [
    'Application or resin system',
    'Target market',
    'Current grade or benchmark',
    'Required quantity',
    'Performance priorities and processing conditions',
  ],
  faq: {eyebrow: 'Common Questions', heading: 'Frequently Asked Questions'},
  disclaimerLabel: 'Technical Disclaimer',
  footerDescription:
    'Application-specific titanium dioxide products and technical support for industrial formulations.',
} as const
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

const APPROVED_COATINGS_FILTERS = [
  {slug: 'all', label: 'All directions'},
  {slug: 'water', label: 'Water-based'},
  {slug: 'architectural', label: 'Architectural'},
  {slug: 'automotive', label: 'Automotive & exterior'},
  {slug: 'specialty', label: 'Specialty'},
] as const

const APPROVED_COATINGS_CANDIDATES = [
  {productId: 'TP-C050', highlights: 'Low ion content · Electrical resistivity · Whiteness · Gloss', badge: null},
  {productId: 'TP-C100', highlights: 'Neutral tint · Hiding power · Whiteness · Durability', badge: null},
  {productId: 'TP-C110', highlights: 'Neutral tint · Hiding power · Whiteness · Durability', badge: null},
  {productId: 'TP-C120', highlights: 'Relatively low viscosity · Bluish tone · Hiding power · Gloss · Durability', badge: 'Premium'},
  {productId: 'TP-C200', highlights: 'Dry hiding power · Weather resistance · Water dispersibility · Oil absorption', badge: null},
  {productId: 'TP-C300', highlights: 'Durability · Weather resistance · Gloss · Hiding power', badge: null},
  {productId: 'TP-C310', highlights: 'Water dispersibility · Storage stability · Weather resistance · Chalk resistance', badge: null},
  {productId: 'TP-C400', highlights: 'Ultra-high weather resistance · Chalk resistance · Color retention · Dispersibility', badge: null},
  {productId: 'TP-C410', highlights: 'Extremely high weather resistance · Chalk resistance · Color retention · Dispersibility', badge: null},
] as const

describe('three-level Product page schemas', () => {
  it('requires the complete TP-C120 v0.5 Detail presentation contract', () => {
    const presentation = (
      tpC120ProductPageInput as typeof tpC120ProductPageInput & {
        presentation?: Record<string, unknown>
      }
    ).presentation

    expect(presentation).toMatchObject({
      hero: {imageAlt: 'TP-C120 rutile titanium dioxide for water-based paint'},
      technicalData: {
        heading: 'TP‑C120 Technical Properties',
        headers: {property: 'Property', value: 'Value', unit: 'Unit'},
      },
      enquiryPreparation: {documentsHeading: 'Packaging and documents'},
      disclaimerLabel: 'Technical Disclaimer',
    })

    const missing = clone(tpC120ProductPageInput) as unknown as {
      presentation?: Record<string, unknown>
    }
    Reflect.deleteProperty(missing, 'presentation')
    expect(productDetailPageInputSchema.safeParse(missing).success).toBe(false)
  })

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
    expect(siteAProductRepresentativeFixture.records).toHaveLength(3)
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

  it('requires the complete Hub presentation contract and rejects malformed copy', () => {
    const expanded = clone(productsHubPageInput) as unknown as Record<
      string,
      unknown
    >
    expanded.presentation = structuredClone(APPROVED_HUB_PRESENTATION)
    expect(productsHubPageInputSchema.safeParse(expanded).success).toBe(true)

    const missing = structuredClone(expanded)
    delete missing.presentation
    expect(productsHubPageInputSchema.safeParse(missing).success).toBe(false)

    const malformed = structuredClone(expanded) as {
      presentation: {
        knownGrade: {searchPlaceholder: string}
        resources: {cards: unknown[]}
        enquiryContextFields: string[]
      }
    }
    malformed.presentation.knownGrade.searchPlaceholder = ''
    malformed.presentation.resources.cards.pop()
    malformed.presentation.enquiryContextFields.pop()
    expect(productsHubPageInputSchema.safeParse(malformed).success).toBe(false)
  })

  it('requires the complete Family presentation contract', () => {
    const approved = clone(coatingsFamilyPageInput) as unknown as {
      presentation?: {
        familyNavigation: {searchLabel: string}
        comparison: {headers: {performanceFocus: string}}
        resources: {cards: unknown[]}
        enquiryContextFields: string[]
      }
    }

    expect(approved.presentation?.familyNavigation.searchLabel).toBe(
      'Filter coatings grades by model',
    )
    expect(approved.presentation?.comparison.headers.performanceFocus).toBe(
      'Key Performance Focus',
    )
    expect(approved.presentation?.resources.cards).toHaveLength(3)
    expect(approved.presentation?.enquiryContextFields).toHaveLength(5)
    expect(productFamilyPageInputSchema.safeParse(approved).success).toBe(true)

    const missing = structuredClone(approved)
    delete missing.presentation
    expect(productFamilyPageInputSchema.safeParse(missing).success).toBe(false)
  })

  it('locks candidate highlights independently from comparison performance copy', () => {
    const navigation = coatingsFamilyPageInput.presentation.familyNavigation as unknown as {
      candidates?: unknown
    }

    expect(navigation.candidates).toEqual(APPROVED_COATINGS_CANDIDATES)
    expect(coatingsFamilyPageInput.products[7]!.performanceFocus).toBe(
      'Ultra-high weather resistance, chalk resistance, color retention, gloss, hiding power',
    )
    expect(APPROVED_COATINGS_CANDIDATES[7].highlights).toContain('Dispersibility')
    expect(APPROVED_COATINGS_CANDIDATES[7].highlights).not.toContain('Gloss')
  })

  it('requires the exact approved Coatings filter sentinel, labels, and order', () => {
    expect(coatingsFamilyPageInput.filters).toEqual(APPROVED_COATINGS_FILTERS)

    const reordered = clone(coatingsFamilyPageInput)
    ;[reordered.filters[0], reordered.filters[1]] = [
      reordered.filters[1]!,
      reordered.filters[0]!,
    ]
    expect(productFamilyPageInputSchema.safeParse(reordered).success).toBe(false)

    const missingAll = clone(coatingsFamilyPageInput)
    missingAll.filters.shift()
    expect(productFamilyPageInputSchema.safeParse(missingAll).success).toBe(false)

    const wrongLabel = clone(coatingsFamilyPageInput)
    wrongLabel.filters[0]!.label = 'Everything'
    expect(productFamilyPageInputSchema.safeParse(wrongLabel).success).toBe(false)

    const duplicate = clone(coatingsFamilyPageInput)
    duplicate.filters[4] = structuredClone(duplicate.filters[3]!)
    expect(productFamilyPageInputSchema.safeParse(duplicate).success).toBe(false)
  })

  it('requires exact resource/card parity and the approved Coatings resource IDs', () => {
    const extra = clone(coatingsFamilyPageInput) as unknown as LooseFamilyPage
    extra.resources.push({type: 'resource', id: 'article-06'})
    expect(productFamilyPageInputSchema.safeParse(extra).success).toBe(false)

    const reordered = clone(coatingsFamilyPageInput)
    ;[reordered.resources[0], reordered.resources[1]] = [
      reordered.resources[1]!,
      reordered.resources[0]!,
    ]
    expect(productFamilyPageInputSchema.safeParse(reordered).success).toBe(false)

    const wrongId = clone(coatingsFamilyPageInput)
    wrongId.resources[2]!.id = 'article-06'
    expect(productFamilyPageInputSchema.safeParse(wrongId).success).toBe(false)
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

  it('locks every approved TP-C120 completeness sequence independently from the fixture', () => {
    expect(tpC120ProductPageInput.formulationPriorities).toEqual(
      EXPECTED_TP_C120_PRIORITIES,
    )
    expect(tpC120ProductPageInput.validationSteps).toEqual(
      EXPECTED_TP_C120_VALIDATION,
    )
    expect(tpC120ProductPageInput.enquiryPreparation.items).toEqual(
      EXPECTED_TP_C120_ENQUIRY_ITEMS,
    )
    expect(tpC120ProductPageInput.faqs).toEqual(EXPECTED_TP_C120_FAQS)
    expect(tpC120ProductPageInput.relatedLinks.products.map(({id}) => id)).toEqual(
      EXPECTED_TP_C120_RELATED.products,
    )
    expect(tpC120ProductPageInput.relatedLinks.resources.map(({id}) => id)).toEqual(
      EXPECTED_TP_C120_RELATED.resources,
    )
    expect(tpC120ProductPageInput.relatedLinks.family.id).toBe(
      EXPECTED_TP_C120_RELATED.family,
    )
  })

  it.each(TP_C120_COMPLETENESS_MUTATIONS)(
    'fails closed on TP-C120 completeness drift: %s',
    (_name, mutate) => {
      expectDetailMutationRejected(mutate)
    },
  )

  it.each([
    'presentation',
    'formulationPriorities',
    'validationSteps',
    'enquiryPreparation',
    'faqs',
    'relatedLinks',
  ] as const)('requires the TP-C120 %s module', (moduleName) => {
    expectDetailMutationRejected((input) => {
      Reflect.deleteProperty(input, moduleName)
    })
  })

  it.each([
    ['cited in Hero HTML', (input: ProductDetailPageInput) => {
      input.hero.directAnswer = '<p>This grade is CiTeD in a source.</p>'
    }],
    ['listed for in Snapshot', (input: ProductDetailPageInput) => {
      input.snapshot[0]!.value = 'LISTED FOR a coating use'
    }],
    ['formulation evaluation in Technical Note', (input: ProductDetailPageInput) => {
      input.technicalNote = 'Use this for formulation evaluation.'
    }],
    ['Reported Technical Data in Fit Check', (input: ProductDetailPageInput) => {
      input.fitCheck.fitWhen[0] = 'Reported Technical Data supports the choice.'
    }],
    ['Reported value in priorities', (input: ProductDetailPageInput) => {
      input.formulationPriorities[0]!.explanation = 'A REPORTED VALUE is available.'
    }],
    ['source TDS across Validation HTML-like text', (input: ProductDetailPageInput) => {
      input.validationSteps[0]!.description = 'Review the source <strong>TDS</strong> first.'
    }],
    ['reproduce in Application Context', (input: ProductDetailPageInput) => {
      input.applicationContext.description = 'RePrOdUcE the source trial.'
    }],
    ['The current TDS lists in Enquiry Preparation', (input: ProductDetailPageInput) => {
      input.enquiryPreparation.packaging = 'The current TDS lists packaging.'
    }],
    ['The current TDS states in FAQ HTML', (input: ProductDetailPageInput) => {
      input.faqs[0]!.answerHtml = '<p>THE CURRENT TDS STATES this answer.</p>'
    }],
    ['TDS does not state in Disclaimer HTML', (input: ProductDetailPageInput) => {
      input.disclaimerHtml = '<p>The TDS does not state a limit.</p>'
    }],
  ])('rejects forbidden audit/source language: %s', (_name, mutate) => {
    expectDetailMutationRejected(mutate)
  })

  it('continues to allow approved customer-facing technical data, evaluation, and request-only TDS wording', () => {
    expect(productDetailPageInputSchema.safeParse(tpC120ProductPageInput).success).toBe(true)
    expect(tpC120ProductPageInput.presentation.technicalData.heading).toContain(
      'Technical Properties',
    )
    expect(tpC120ProductPageInput.disclaimerHtml).toContain('technical evaluation')
    expect(tpC120ProductPageInput.enquiryPreparation.tdsAccess).toContain(
      'TDS is available on request',
    )
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
