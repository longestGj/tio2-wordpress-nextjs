import {z} from 'zod'

import {
  editorialTargetSchema,
  editorialTimestamp,
  requiredEditorialText,
} from '@/lib/editorial/schema'
import {
  containsForbiddenEditorialClaim,
  containsPrivateEditorialLocation,
  hasEditorialRichTextContent,
  normalizeEditorialInternalPath,
  sanitizeEditorialRichText,
} from '@/lib/editorial/rich-text'

import {
  SITE_A_PRODUCT_FAMILIES,
  SITE_A_PRODUCT_IDENTITIES,
  resolveProductPageIdentity,
} from './page-graph'

const FORBIDDEN_PRODUCT_COPY_PATTERN =
  /\b(?:supplier|manufacturer|producer|factory|legal\s+(?:entity|identity)|price|pricing|stock|moq|minimum\s+order(?:\s+quantity)?)\b/iu
const PUBLIC_URL_PATTERN = /\b(?:https?:\/\/|www\.)/iu
const TDS_PATTERN = /\b(?:tds|technical\s+data\s+sheet)\b/iu
const DOWNLOAD_PATTERN = /\bdownload(?:able|ed|ing|s)?\b/iu
const INTERNAL_COPY_PATH_PATTERN = /(?:^|[\s"'(=])\/[a-z0-9][a-z0-9/_-]*/iu
const DOWNLOAD_PATH_PATTERN = /\/downloads?(?:\/|\b)/iu
const IMAGE_PATTERN = /^\/site-a\/products\/[a-z0-9]+(?:-[a-z0-9]+)*\.(?:jpg|png)$/u

function addProductCopySafetyIssue(
  value: string,
  context: z.RefinementCtx,
): void {
  if (
    containsPrivateEditorialLocation(value) ||
    containsForbiddenEditorialClaim(value) ||
    FORBIDDEN_PRODUCT_COPY_PATTERN.test(value) ||
    PUBLIC_URL_PATTERN.test(value) ||
    DOWNLOAD_PATH_PATTERN.test(value) ||
    (TDS_PATTERN.test(value) &&
      (DOWNLOAD_PATTERN.test(value) || INTERNAL_COPY_PATH_PATTERN.test(value)))
  ) {
    context.addIssue({
      code: 'custom',
      message: 'Product page content contains private or commercial leakage',
    })
  }
}

const text = (maximum = 2_000) =>
  requiredEditorialText(maximum).superRefine(addProductCopySafetyIssue)
const emptyUnit = z.string().trim().max(80).superRefine(addProductCopySafetyIssue)
const html = z
  .string()
  .trim()
  .min(1)
  .max(20_000)
  .superRefine((value, context) => {
    addProductCopySafetyIssue(value, context)
    const sanitized = sanitizeEditorialRichText(value)
    if (
      sanitized !== value ||
      !hasEditorialRichTextContent(sanitized)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Rich text must already satisfy the editorial allowlist',
      })
    }
  })
const internalPath = z.string().trim().refine(
  (value) => normalizeEditorialInternalPath(value) !== null,
  'Expected a canonical internal path',
)
const image = z.string().trim().regex(IMAGE_PATTERN)
const familySlug = z.enum(
  SITE_A_PRODUCT_FAMILIES.map(({slug}) => slug) as [
    (typeof SITE_A_PRODUCT_FAMILIES)[number]['slug'],
    ...(typeof SITE_A_PRODUCT_FAMILIES)[number]['slug'][],
  ],
)

const identity = z
  .object({
    id: text(80),
    title: text(180),
    slug: text(100),
    path: internalPath,
    modified: editorialTimestamp,
  })
  .strict()
const seo = z
  .object({title: text(180), description: text(500)})
  .strict()
const collectionHero = z
  .object({
    eyebrow: text(120),
    headline: text(180),
    directAnswer: html,
    image,
  })
  .strict()
const decisionRailItem = z
  .object({index: text(10), label: text(100)})
  .strict()
const decisionStep = z
  .object({index: text(10), title: text(180), description: text()})
  .strict()
const faq = z
  .object({question: text(180), answerHtml: html})
  .strict()
const discussApplicationCta = z
  .object({
    kind: z.literal('discuss-application'),
    label: z.literal('Discuss Your Application'),
  })
  .strict()
const requestTdsCta = z
  .object({kind: z.literal('request-tds'), label: z.literal('Request a TDS')})
  .strict()
const requestSampleCta = z
  .object({kind: z.literal('request-sample'), label: z.literal('Request a Sample')})
  .strict()
const collectionEnquiryCtas = z.tuple([
  discussApplicationCta,
  requestTdsCta,
])
const detailHeroCtas = z.tuple([requestTdsCta, discussApplicationCta])
const detailEnquiryCtas = z.tuple([
  requestTdsCta,
  discussApplicationCta,
  requestSampleCta,
])
const detailFinalCtas = z.tuple([requestTdsCta, discussApplicationCta])
const enquiry = z
  .object({
    eyebrow: text(120),
    heading: text(180),
    description: text(),
    ctas: collectionEnquiryCtas,
  })
  .strict()
const applicationTarget = editorialTargetSchema.refine(
  (target) => target.type === 'application',
  'Expected an Application editorial target',
)
const resourceTarget = editorialTargetSchema.refine(
  (target) => target.type === 'resource',
  'Expected a Resource editorial target',
)
const productTarget = editorialTargetSchema.refine(
  (target) => target.type === 'product',
  'Expected a Product editorial target',
)

const familyCardInput = z
  .object({
    slug: familySlug,
    title: text(120),
    summary: text(),
    count: z.number().int().positive(),
  })
  .strict()
const knownGradeInput = z
  .object({
    productId: text(80),
    productSlug: text(100),
    familySlug,
    familyTitle: text(120),
  })
  .strict()
const filterInput = z
  .object({slug: text(80), label: text(120)})
  .strict()
const familyProductInput = z
  .object({
    productId: text(80),
    productSlug: text(100),
    displayOrder: z.number().int().positive(),
    cardSummary: text(),
    applicationFocus: text(),
    performanceFocus: text(),
    surfaceTreatmentPositioning: text(),
    filterTags: z.array(text(80)).min(1).max(8),
  })
  .strict()
const technicalProperty = z
  .object({
    property: text(180),
    value: text(120),
    unit: emptyUnit,
    displayOrder: z.number().int().positive(),
  })
  .strict()

const expectedFamilies = SITE_A_PRODUCT_FAMILIES.map(
  ({slug, title, productIds}) => ({slug, title, count: productIds.length}),
)
const expectedKnownGrades = SITE_A_PRODUCT_FAMILIES.flatMap(
  ({slug, title, productIds}) =>
    productIds.map((productId) => ({
      productId,
      productSlug: productId.toLowerCase(),
      familySlug: slug,
      familyTitle: title,
    })),
)
const familiesBySlug = new Map(
  SITE_A_PRODUCT_FAMILIES.map((definition) => [definition.slug, definition]),
)

function addMismatch(
  context: z.RefinementCtx,
  message: string,
  path: PropertyKey[],
): void {
  context.addIssue({code: 'custom', message, path})
}

export const productsHubPageInputSchema = z
  .object({
    level: z.literal('hub'),
    identity,
    seo,
    hero: collectionHero,
    decisionRail: z.array(decisionRailItem).min(1).max(8),
    families: z.array(familyCardInput).length(8),
    knownGrades: z.array(knownGradeInput).length(25),
    decisionPath: z.array(decisionStep).min(1).max(8),
    applicationBoundary: z
      .object({
        heading: text(180),
        description: text(),
        link: applicationTarget,
      })
      .strict(),
    resources: z.array(resourceTarget).min(1).max(8),
    enquiry,
    faqs: z.array(faq).min(4).max(6),
    disclaimerHtml: html,
  })
  .strict()
  .superRefine((page, context) => {
    if (
      page.identity.id !== 'products-hub' ||
      page.identity.slug !== 'products' ||
      normalizeEditorialInternalPath(page.identity.path) !== '/products'
    ) {
      addMismatch(context, 'Products Hub identity must be canonical', [
        'identity',
      ])
    }
    if (page.hero.image !== '/site-a/products/products-hub-hero.jpg') {
      addMismatch(context, 'Products Hub image must be approved', [
        'hero',
        'image',
      ])
    }
    page.families.forEach((family, index) => {
      const expected = expectedFamilies[index]
      if (
        !expected ||
        family.slug !== expected.slug ||
        family.title !== expected.title ||
        family.count !== expected.count
      ) {
        addMismatch(
          context,
          'Products Hub Families must preserve the approved graph order',
          ['families', index],
        )
      }
    })
    page.knownGrades.forEach((grade, index) => {
      const expected = expectedKnownGrades[index]
      if (
        !expected ||
        grade.productId !== expected.productId ||
        grade.productSlug !== expected.productSlug ||
        grade.familySlug !== expected.familySlug ||
        grade.familyTitle !== expected.familyTitle
      ) {
        addMismatch(
          context,
          'Known Grades must preserve the approved graph order',
          ['knownGrades', index],
        )
      }
    })
  })

export const productFamilyPageInputSchema = z
  .object({
    level: z.literal('family'),
    identity: identity
      .extend({familySlug})
      .strict(),
    seo,
    hero: collectionHero,
    decisionRail: z.array(decisionRailItem).min(1).max(8),
    filters: z.array(filterInput).min(1).max(12),
    products: z.array(familyProductInput).min(1).max(25),
    comparison: z
      .object({
        caption: text(300),
        products: z.array(familyProductInput).min(1).max(25),
      })
      .strict(),
    selectionMethod: z
      .object({
        eyebrow: text(120),
        heading: text(180),
        description: text(),
      })
      .strict(),
    validationSteps: z.array(decisionStep).min(1).max(8),
    applications: z.array(applicationTarget).min(1).max(8),
    resources: z.array(resourceTarget).min(1).max(8),
    enquiry,
    faqs: z.array(faq).min(4).max(6),
    disclaimerHtml: html,
  })
  .strict()
  .superRefine((page, context) => {
    const definition = familiesBySlug.get(page.identity.familySlug)
    if (
      !definition ||
      page.identity.id !== definition.slug ||
      page.identity.slug !== definition.slug ||
      normalizeEditorialInternalPath(page.identity.path) !==
        `/products/${definition.slug}`
    ) {
      addMismatch(context, 'Product Family identity must be canonical', [
        'identity',
      ])
    }
    if (
      page.identity.familySlug === 'coatings' &&
      page.hero.image !== '/site-a/products/coatings-family-hero.png'
    ) {
      addMismatch(context, 'Coatings image must be approved', ['hero', 'image'])
    }

    const filterSlugs = new Set<string>()
    page.filters.forEach(({slug}, index) => {
      if (filterSlugs.has(slug)) {
        addMismatch(context, 'Family filter slugs must be unique', [
          'filters',
          index,
          'slug',
        ])
      }
      filterSlugs.add(slug)
    })
    const selectableTags = new Set(filterSlugs)
    selectableTags.delete('all')

    const expectedIds = definition?.productIds ?? []
    if (page.products.length !== expectedIds.length) {
      addMismatch(context, 'Family Products must match canonical membership', [
        'products',
      ])
    }
    const orders = new Set<number>()
    page.products.forEach((product, index) => {
      if (
        product.productId !== expectedIds[index] ||
        product.productSlug !== product.productId.toLowerCase()
      ) {
        addMismatch(
          context,
          'Family Products must preserve canonical membership order',
          ['products', index, 'productId'],
        )
      }
      if (orders.has(product.displayOrder) || product.displayOrder !== index + 1) {
        addMismatch(
          context,
          'Family Product display orders must be unique and sequential',
          ['products', index, 'displayOrder'],
        )
      }
      orders.add(product.displayOrder)
      product.filterTags.forEach((tag, tagIndex) => {
        if (!selectableTags.has(tag)) {
          addMismatch(context, 'Family Product filter tag is not controlled', [
            'products',
            index,
            'filterTags',
            tagIndex,
          ])
        }
      })
    })

    if (JSON.stringify(page.comparison.products) !== JSON.stringify(page.products)) {
      addMismatch(
        context,
        'Family comparison rows must match every candidate without drift',
        ['comparison', 'products'],
      )
    }
  })

export const TP_C120_TECHNICAL_PROPERTIES = [
  ['TiO₂ content', '95', '%'],
  ['Rutile content', '99.9', '%'],
  ['Dry L*', '99.4', ''],
  ['Dry b*', '1.00', ''],
  ['Specific gravity', '4.1', 'g/cm3'],
  ['pH', '7.5', ''],
  ['Carbon black undertone (CBU)', '14.0', ''],
  ['Oil absorption', '17', 'g/100 g'],
  ['Mean particle size', '0.27', 'micrometres'],
] as const

export const productDetailPageInputSchema = z
  .object({
    level: z.literal('detail'),
    identity: identity
      .extend({productId: text(80), familySlug})
      .strict(),
    seo,
    hero: collectionHero
      .extend({ctas: detailHeroCtas})
      .strict(),
    decisionRail: z.array(decisionRailItem).min(1).max(8),
    snapshot: z
      .array(z.object({label: text(120), value: text()}).strict())
      .min(1)
      .max(8),
    technicalProperties: z.array(technicalProperty).min(1).max(24),
    technicalNote: text(),
    fitCheck: z
      .object({
        fitWhen: z.array(text()).min(1).max(8),
        discussFirstWhen: z.array(text()).min(1).max(8),
      })
      .strict(),
    formulationPriorities: z
      .array(z.object({title: text(180), explanation: text()}).strict())
      .min(1)
      .max(8),
    validationSteps: z.array(decisionStep).min(1).max(8),
    applicationContext: z
      .object({
        eyebrow: text(120),
        heading: text(180),
        description: text(),
        application: applicationTarget,
      })
      .strict(),
    enquiryPreparation: z
      .object({
        items: z.array(text()).min(1).max(12),
        packaging: text(),
        tdsAccess: text(),
        ctas: detailEnquiryCtas,
      })
      .strict(),
    faqs: z.array(faq).min(4).max(6),
    relatedLinks: z
      .object({
        products: z.array(productTarget).min(1).max(8),
        resources: z.array(resourceTarget).min(1).max(8),
        family: productTarget,
      })
      .strict(),
    finalCtas: detailFinalCtas,
    disclaimerHtml: html,
  })
  .strict()
  .superRefine((page, context) => {
    const canonical = resolveProductPageIdentity(page.identity.path)
    if (
      !canonical ||
      canonical.level !== 'detail' ||
      canonical.id !== page.identity.id ||
      canonical.id !== page.identity.productId ||
      canonical.familySlug !== page.identity.familySlug ||
      canonical.productSlug !== page.identity.slug
    ) {
      addMismatch(context, 'Product Detail identity must be canonical', [
        'identity',
      ])
    }
    if (
      page.identity.productId === 'TP-C120' &&
      page.hero.image !== '/site-a/products/tp-c120-hero.png'
    ) {
      addMismatch(context, 'TP-C120 image must be approved', ['hero', 'image'])
    }

    const orders = new Set<number>()
    page.technicalProperties.forEach(({displayOrder}, index) => {
      if (orders.has(displayOrder) || displayOrder !== index + 1) {
        addMismatch(
          context,
          'Technical-property order must be unique and sequential',
          ['technicalProperties', index, 'displayOrder'],
        )
      }
      orders.add(displayOrder)
    })

    if (page.identity.productId === 'TP-C120') {
      if (page.technicalProperties.length !== TP_C120_TECHNICAL_PROPERTIES.length) {
        addMismatch(
          context,
          'TP-C120 must preserve all nine approved technical properties',
          ['technicalProperties'],
        )
      }
      page.technicalProperties.forEach((property, index) => {
        const expected = TP_C120_TECHNICAL_PROPERTIES[index]
        if (
          !expected ||
          property.property !== expected[0] ||
          property.value !== expected[1] ||
          property.unit !== expected[2] ||
          property.displayOrder !== index + 1
        ) {
          addMismatch(
            context,
            'TP-C120 technical properties must preserve value, unit, and order',
            ['technicalProperties', index],
          )
        }
      })
    }
  })

export const productExperiencePageInputSchema = z.discriminatedUnion('level', [
  productsHubPageInputSchema,
  productFamilyPageInputSchema,
  productDetailPageInputSchema,
])

export const siteAProductRepresentativeFixtureSchema = z
  .object({
    version: z.literal('0.5'),
    siteId: z.literal('tio2-a'),
    records: z
      .tuple([
        productsHubPageInputSchema,
        productFamilyPageInputSchema,
        productDetailPageInputSchema,
      ]),
  })
  .strict()
  .superRefine((fixture, context) => {
    if (
      fixture.records[0].identity.id !== 'products-hub' ||
      fixture.records[1].identity.familySlug !== 'coatings' ||
      fixture.records[2].identity.productId !== 'TP-C120'
    ) {
      addMismatch(
        context,
        'Representative fixture must contain only Hub, Coatings, and TP-C120',
        ['records'],
      )
    }
  })

export type ProductsHubPageInput = z.infer<typeof productsHubPageInputSchema>
export type ProductFamilyPageInput = z.infer<
  typeof productFamilyPageInputSchema
>
export type ProductDetailPageInput = z.infer<typeof productDetailPageInputSchema>
export type ProductExperiencePageInput = z.infer<
  typeof productExperiencePageInputSchema
>
export type SiteAProductRepresentativeFixture = z.infer<
  typeof siteAProductRepresentativeFixtureSchema
>

export const SITE_A_PRODUCT_PAGE_PATHS = new Set(
  SITE_A_PRODUCT_IDENTITIES.map(({path}) => path),
)
