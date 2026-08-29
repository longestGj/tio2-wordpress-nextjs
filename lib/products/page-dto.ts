import type {ZodIssue} from 'zod'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import {
  containsForbiddenEditorialClaim,
  containsPrivateEditorialLocation,
  normalizeEditorialInternalPath,
  sanitizeEditorialRichText,
} from '@/lib/editorial/rich-text'
import type {EditorialLink, EditorialTarget} from '@/lib/editorial/types'

import {SITE_A_PRODUCT_IDENTITIES} from './page-graph'
import {
  productDetailPageInputSchema,
  productFamilyPageInputSchema,
  productsHubPageInputSchema,
  type ProductDetailPageInput,
  type ProductFamilyPageInput,
  type ProductsHubPageInput,
} from './page-schema'
import type {
  FamilyProductItem,
  PageCta,
  ProductDetailPageDto,
  ProductExperiencePageDto,
  ProductFamilyPageDto,
  ProductPageResolver,
  ProductsHubPageDto,
} from './page-types'

export class ProductPageContractError extends Error {
  readonly issues: readonly string[]

  constructor(issues: readonly string[]) {
    const uniqueIssues = [...new Set(issues)]
    super(`Invalid Product page render contract: ${uniqueIssues.join(', ')}`)
    this.name = 'ProductPageContractError'
    this.issues = uniqueIssues
  }
}

const validatedPages = new WeakSet<object>()
const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)

function issuePath(issue: ZodIssue): string {
  return issue.path.map(String).join('.') || 'productPage'
}

function normalizedTimestamp(value: string): string {
  return new Date(`${value.replace(/Z$/u, '')}Z`).toISOString()
}

function expectedTargetPath(target: EditorialTarget): string | null {
  if (target.type === 'product') return productPaths.get(target.id) ?? null
  return resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

function checkedEditorialLink(
  target: EditorialTarget,
  resolve: ProductPageResolver,
  path: string,
): EditorialLink {
  const expectedPath = expectedTargetPath(target)
  const link = resolve.editorial(target)
  const normalizedPath = link && normalizeEditorialInternalPath(link.path)
  const normalizedHref =
    link?.href === null
      ? null
      : link && normalizeEditorialInternalPath(link.href)
  const title = link?.title.trim()
  if (
    !expectedPath ||
    !link ||
    link.type !== target.type ||
    link.id !== target.id ||
    normalizedPath !== expectedPath ||
    (normalizedHref !== null && normalizedHref !== expectedPath) ||
    !title ||
    [title, link.path, link.href ?? ''].some(
      (value) =>
        containsPrivateEditorialLocation(value) ||
        containsForbiddenEditorialClaim(value),
    )
  ) {
    throw new ProductPageContractError([path])
  }
  return {
    type: link.type,
    id: link.id,
    title,
    path: normalizedPath,
    href: normalizedHref,
  }
}

function checkedProductHref(
  id: string,
  resolve: ProductPageResolver,
  path: string,
): string | null {
  return checkedEditorialLink({type: 'product', id}, resolve, path).href
}

function normalizeCtas(
  ctas: ReadonlyArray<{kind: PageCta['kind']; label: string}>,
  resolve: ProductPageResolver,
  path: string,
): PageCta[] {
  return ctas.map((cta, index) => {
    const href = resolve.ctaHref(cta.kind).trim()
    if (
      !href ||
      /^(?:javascript|data|file):/iu.test(href) ||
      containsPrivateEditorialLocation(href)
    ) {
      throw new ProductPageContractError([`${path}.${index}.href`])
    }
    return {...cta, href}
  })
}

function normalizeIdentity<T extends {path: string; modified: string}>(
  identity: T,
): T {
  const path = normalizeEditorialInternalPath(identity.path)
  if (!path) throw new ProductPageContractError(['identity.path'])
  return {...identity, path, modified: normalizedTimestamp(identity.modified)}
}

function normalizeFaqs<T extends {question: string; answerHtml: string}>(
  faqs: readonly T[],
): T[] {
  return faqs.map((faq) => ({
    ...faq,
    answerHtml: sanitizeEditorialRichText(faq.answerHtml),
  }))
}

function normalizeFamilyProducts(
  products: ProductFamilyPageInput['products'],
  resolve: ProductPageResolver,
  path: string,
): FamilyProductItem[] {
  return products.map((product, index) => ({
    ...product,
    filterTags: [...product.filterTags],
    href: checkedProductHref(
      product.productId,
      resolve,
      `${path}.${index}.href`,
    ),
  }))
}

function markValidated<T extends ProductExperiencePageDto>(page: T): T {
  validatedPages.add(page)
  return page
}

function normalizeHub(
  page: ProductsHubPageInput,
  resolve: ProductPageResolver,
): ProductsHubPageDto {
  return markValidated({
    level: 'hub',
    identity: normalizeIdentity(page.identity),
    seo: {...page.seo},
    hero: {
      ...page.hero,
      directAnswer: sanitizeEditorialRichText(page.hero.directAnswer),
    },
    presentation: {
      breadcrumb: {...page.presentation.breadcrumb},
      hero: {
        imageAlt: page.presentation.hero.imageAlt,
        familyAction: {
          label: page.presentation.hero.familyActionLabel,
          href: '#product-families',
        },
        enquiryAction: normalizeCtas(
          [page.presentation.hero.enquiryAction],
          resolve,
          'presentation.hero.enquiryAction',
        )[0]!,
      },
      families: {...page.presentation.families},
      knownGrade: {...page.presentation.knownGrade},
      decisionPath: {...page.presentation.decisionPath},
      applicationBoundary: {...page.presentation.applicationBoundary},
      resources: {
        eyebrow: page.presentation.resources.eyebrow,
        heading: page.presentation.resources.heading,
        cards: page.presentation.resources.cards.map((card) => ({...card})),
      },
      enquiryContextFields: [...page.presentation.enquiryContextFields],
      faq: {...page.presentation.faq},
      disclaimerLabel: page.presentation.disclaimerLabel,
      footerDescription: page.presentation.footerDescription,
    },
    decisionRail: page.decisionRail.map((item) => ({...item})),
    families: page.families.map((family, index) => ({
      ...family,
      href: checkedProductHref(
        family.slug,
        resolve,
        `families.${index}.href`,
      ),
    })),
    knownGrades: page.knownGrades.map((grade, index) => ({
      ...grade,
      href: checkedProductHref(
        grade.productId,
        resolve,
        `knownGrades.${index}.href`,
      ),
    })),
    decisionPath: page.decisionPath.map((step) => ({...step})),
    applicationBoundary: {
      heading: page.applicationBoundary.heading,
      description: page.applicationBoundary.description,
      link: checkedEditorialLink(
        page.applicationBoundary.link,
        resolve,
        'applicationBoundary.link',
      ),
    },
    resources: page.resources.map((target, index) =>
      checkedEditorialLink(target, resolve, `resources.${index}`),
    ),
    enquiry: {
      ...page.enquiry,
      ctas: normalizeCtas(page.enquiry.ctas, resolve, 'enquiry.ctas'),
    },
    faqs: normalizeFaqs(page.faqs),
    disclaimerHtml: sanitizeEditorialRichText(page.disclaimerHtml),
  })
}

function normalizeFamily(
  page: ProductFamilyPageInput,
  resolve: ProductPageResolver,
): ProductFamilyPageDto {
  return markValidated({
    level: 'family',
    identity: normalizeIdentity(page.identity),
    seo: {...page.seo},
    hero: {
      ...page.hero,
      directAnswer: sanitizeEditorialRichText(page.hero.directAnswer),
    },
    decisionRail: page.decisionRail.map((item) => ({...item})),
    filters: page.filters.map((filter) => ({...filter})),
    products: normalizeFamilyProducts(page.products, resolve, 'products'),
    comparison: {
      caption: page.comparison.caption,
      products: normalizeFamilyProducts(
        page.comparison.products,
        resolve,
        'comparison.products',
      ),
    },
    selectionMethod: {...page.selectionMethod},
    validationSteps: page.validationSteps.map((step) => ({...step})),
    applications: page.applications.map((target, index) =>
      checkedEditorialLink(target, resolve, `applications.${index}`),
    ),
    resources: page.resources.map((target, index) =>
      checkedEditorialLink(target, resolve, `resources.${index}`),
    ),
    enquiry: {
      ...page.enquiry,
      ctas: normalizeCtas(page.enquiry.ctas, resolve, 'enquiry.ctas'),
    },
    faqs: normalizeFaqs(page.faqs),
    disclaimerHtml: sanitizeEditorialRichText(page.disclaimerHtml),
  })
}

function normalizeDetail(
  page: ProductDetailPageInput,
  resolve: ProductPageResolver,
): ProductDetailPageDto {
  return markValidated({
    level: 'detail',
    identity: normalizeIdentity(page.identity),
    seo: {...page.seo},
    hero: {
      ...page.hero,
      directAnswer: sanitizeEditorialRichText(page.hero.directAnswer),
      ctas: normalizeCtas(page.hero.ctas, resolve, 'hero.ctas'),
    },
    decisionRail: page.decisionRail.map((item) => ({...item})),
    snapshot: page.snapshot.map((item) => ({...item})),
    technicalProperties: page.technicalProperties.map((property) => ({
      ...property,
    })),
    technicalNote: page.technicalNote,
    fitCheck: {
      fitWhen: [...page.fitCheck.fitWhen],
      discussFirstWhen: [...page.fitCheck.discussFirstWhen],
    },
    formulationPriorities: page.formulationPriorities.map((priority) => ({
      ...priority,
    })),
    validationSteps: page.validationSteps.map((step) => ({...step})),
    applicationContext: {
      eyebrow: page.applicationContext.eyebrow,
      heading: page.applicationContext.heading,
      description: page.applicationContext.description,
      application: checkedEditorialLink(
        page.applicationContext.application,
        resolve,
        'applicationContext.application',
      ),
    },
    enquiryPreparation: {
      items: [...page.enquiryPreparation.items],
      packaging: page.enquiryPreparation.packaging,
      tdsAccess: page.enquiryPreparation.tdsAccess,
      ctas: normalizeCtas(
        page.enquiryPreparation.ctas,
        resolve,
        'enquiryPreparation.ctas',
      ),
    },
    faqs: normalizeFaqs(page.faqs),
    relatedLinks: {
      products: page.relatedLinks.products.map((target, index) =>
        checkedEditorialLink(
          target,
          resolve,
          `relatedLinks.products.${index}`,
        ),
      ),
      resources: page.relatedLinks.resources.map((target, index) =>
        checkedEditorialLink(
          target,
          resolve,
          `relatedLinks.resources.${index}`,
        ),
      ),
      family: checkedEditorialLink(
        page.relatedLinks.family,
        resolve,
        'relatedLinks.family',
      ),
    },
    finalCtas: normalizeCtas(page.finalCtas, resolve, 'finalCtas'),
    disclaimerHtml: sanitizeEditorialRichText(page.disclaimerHtml),
  })
}

export function toProductsHubPageDto(
  input: unknown,
  resolve: ProductPageResolver,
): ProductsHubPageDto {
  const parsed = productsHubPageInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ProductPageContractError(parsed.error.issues.map(issuePath))
  }
  return normalizeHub(parsed.data, resolve)
}

export function toProductFamilyPageDto(
  input: unknown,
  resolve: ProductPageResolver,
): ProductFamilyPageDto {
  const parsed = productFamilyPageInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ProductPageContractError(parsed.error.issues.map(issuePath))
  }
  return normalizeFamily(parsed.data, resolve)
}

export function toProductDetailPageDto(
  input: unknown,
  resolve: ProductPageResolver,
): ProductDetailPageDto {
  const parsed = productDetailPageInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new ProductPageContractError(parsed.error.issues.map(issuePath))
  }
  return normalizeDetail(parsed.data, resolve)
}

export function isValidatedProductExperiencePage(
  value: unknown,
): value is ProductExperiencePageDto {
  return !!value && typeof value === 'object' && validatedPages.has(value)
}
