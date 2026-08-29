export type ProductFamilySlug =
  | 'coatings' | 'plastics-masterbatch' | 'engineering-plastics'
  | 'decorative-paper' | 'printing-inks' | 'solar-film'
  | 'high-purity-functional' | 'universal'

export interface ProductFamilyDefinition {
  slug: ProductFamilySlug
  title: string
  productIds: readonly string[]
}

export interface ProductPageIdentity {
  id: 'products-hub' | ProductFamilySlug | `TP-${string}`
  level: 'hub' | 'family' | 'detail'
  familySlug: ProductFamilySlug | null
  productSlug: string | null
  path: string
}

export const SITE_A_PRODUCT_FAMILIES: readonly ProductFamilyDefinition[] = Object.freeze([
  Object.freeze({
    slug: 'coatings' as const,
    title: 'Coatings',
    productIds: Object.freeze([
      'TP-C050', 'TP-C100', 'TP-C110', 'TP-C120', 'TP-C200',
      'TP-C300', 'TP-C310', 'TP-C400', 'TP-C410',
    ]),
  }),
  Object.freeze({
    slug: 'plastics-masterbatch' as const,
    title: 'Plastics & Masterbatch',
    productIds: Object.freeze(['TP-P100', 'TP-P110', 'TP-P120', 'TP-P200']),
  }),
  Object.freeze({
    slug: 'engineering-plastics' as const,
    title: 'Engineering Plastics',
    productIds: Object.freeze(['TP-P300', 'TP-P310', 'TP-P320', 'TP-P330']),
  }),
  Object.freeze({
    slug: 'decorative-paper' as const,
    title: 'Decorative Paper',
    productIds: Object.freeze(['TP-PA100', 'TP-PA110', 'TP-PA120']),
  }),
  Object.freeze({
    slug: 'printing-inks' as const,
    title: 'Printing Inks',
    productIds: Object.freeze(['TP-I100', 'TP-I200']),
  }),
  Object.freeze({
    slug: 'solar-film' as const,
    title: 'Solar Film',
    productIds: Object.freeze(['TP-S100']),
  }),
  Object.freeze({
    slug: 'high-purity-functional' as const,
    title: 'High-Purity & Functional',
    productIds: Object.freeze(['TP-H100']),
  }),
  Object.freeze({
    slug: 'universal' as const,
    title: 'Universal',
    productIds: Object.freeze(['TP-U100']),
  }),
])

function familyIdentity({slug}: ProductFamilyDefinition): ProductPageIdentity {
  return Object.freeze({
    id: slug,
    level: 'family',
    familySlug: slug,
    productSlug: null,
    path: `/products/${slug}`,
  })
}

function detailIdentity(
  familySlug: ProductFamilySlug,
  productId: string,
): ProductPageIdentity {
  const productSlug = productId.toLowerCase()
  return Object.freeze({
    id: productId as `TP-${string}`,
    level: 'detail',
    familySlug,
    productSlug,
    path: `/products/${familySlug}/${productSlug}`,
  })
}

export const SITE_A_PRODUCT_IDENTITIES: readonly ProductPageIdentity[] = Object.freeze([
  Object.freeze({
    id: 'products-hub' as const,
    level: 'hub' as const,
    familySlug: null,
    productSlug: null,
    path: '/products',
  }),
  ...SITE_A_PRODUCT_FAMILIES.flatMap((family) => [
    familyIdentity(family),
    ...family.productIds.map((productId) => detailIdentity(family.slug, productId)),
  ]),
])

const PRODUCT_IDENTITIES_BY_PATH = new Map(
  SITE_A_PRODUCT_IDENTITIES.map((identity) => [identity.path, identity]),
)

export function resolveProductPageIdentity(path: string): ProductPageIdentity | null {
  return PRODUCT_IDENTITIES_BY_PATH.get(path) ?? null
}
