import {describe, expect, it} from 'vitest'

import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver, EditorialTarget} from '@/lib/editorial/types'
import {
  ProductPageContractError,
  isValidatedProductExperiencePage,
  toProductDetailPageDto,
  toProductFamilyPageDto,
  toProductsHubPageDto,
} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {PageCta, ProductPageResolver} from '@/lib/products/page-types'
import {
  coatingsFamilyPageInput,
  productsHubPageInput,
  tpC120ProductPageInput,
} from '@/tests/fixtures/products/product-pages'

const clone = <T>(value: T): T => structuredClone(value)
const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)
const titles = new Map<string, string>([
  ['applications-hub', 'Applications'],
  ['coatings', 'All Coatings Products'],
  ['water-based-paint', 'Titanium Dioxide for Water-Based Paint'],
  ['article-03', 'Why TiO₂ Content Alone Does Not Determine Performance'],
  ['article-04', 'Oil Absorption in TiO₂'],
  ['article-06', 'Surface Treatment'],
  ['article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
  ['article-08', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint'],
  ['article-10', 'How to Choose Titanium Dioxide for Outdoor Durability'],
])

function pathFor(target: EditorialTarget): string | null {
  if (target.type === 'product') return productPaths.get(target.id) ?? null
  return resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

function resolver(
  authorized: readonly string[] = [],
  mutate?: (target: EditorialTarget, link: NonNullable<ReturnType<EditorialLinkResolver>>) => NonNullable<ReturnType<EditorialLinkResolver>>,
): ProductPageResolver {
  const editorial: EditorialLinkResolver = (target) => {
    const path = pathFor(target)
    if (!path) return null
    const link = {
      ...target,
      title: titles.get(target.id) ?? target.id,
      path,
      href: authorized.includes(path) ? path : null,
    }
    return mutate ? mutate(target, link) : link
  }
  return {
    editorial,
    ctaHref: () => 'mailto:contact@tio2products.com',
  }
}

describe('Product page DTO normalization', () => {
  it('normalizes all three explicit levels and brands them as validated DTOs', () => {
    const pages = [
      toProductsHubPageDto(clone(productsHubPageInput), resolver()),
      toProductFamilyPageDto(clone(coatingsFamilyPageInput), resolver()),
      toProductDetailPageDto(clone(tpC120ProductPageInput), resolver()),
    ]
    expect(pages.map(({level}) => level)).toEqual(['hub', 'family', 'detail'])
    expect(pages.every(isValidatedProductExperiencePage)).toBe(true)
    expect(isValidatedProductExperiencePage(productsHubPageInput)).toBe(false)
  })

  it('keeps useful closed-target titles while suppressing only href', () => {
    const hub = toProductsHubPageDto(clone(productsHubPageInput), resolver())
    const detail = toProductDetailPageDto(clone(tpC120ProductPageInput), resolver())

    expect(hub.families[0]).toMatchObject({title: 'Coatings', href: null})
    expect(hub.applicationBoundary.link).toEqual({
      type: 'application',
      id: 'applications-hub',
      title: 'Applications',
      path: '/applications',
      href: null,
    })
    expect(detail.relatedLinks.family).toMatchObject({
      title: 'All Coatings Products',
      path: '/products/coatings',
      href: null,
    })
  })

  it('admits only authorized canonical nested Product hrefs', () => {
    const paths = ['/products/coatings', '/products/coatings/tp-c120']
    const hub = toProductsHubPageDto(
      clone(productsHubPageInput),
      resolver(paths),
    )
    expect(hub.families[0]!.href).toBe('/products/coatings')
    expect(
      hub.knownGrades.find(({productId}) => productId === 'TP-C120')?.href,
    ).toBe('/products/coatings/tp-c120')
    expect(
      hub.knownGrades.find(({productId}) => productId === 'TP-C100')?.href,
    ).toBeNull()
  })

  it('derives every CTA href from ctaHref and rejects WordPress href input', () => {
    const calls: PageCta['kind'][] = []
    const resolve = resolver()
    resolve.ctaHref = (kind) => {
      calls.push(kind)
      return `mailto:contact@tio2products.com?subject=${kind}`
    }
    const detail = toProductDetailPageDto(
      clone(tpC120ProductPageInput),
      resolve,
    )
    expect(detail.hero.ctas.map(({href}) => href)).toEqual([
      'mailto:contact@tio2products.com?subject=request-tds',
      'mailto:contact@tio2products.com?subject=discuss-application',
    ])
    expect(calls).toContain('request-sample')

    const arbitrary = clone(tpC120ProductPageInput) as unknown as {
      finalCtas: Array<Record<string, unknown>>
    }
    arbitrary.finalCtas[0]!.href = '/arbitrary'
    expect(() => toProductDetailPageDto(arbitrary, resolver())).toThrow(
      ProductPageContractError,
    )
  })

  it('rejects resolver ID/path mismatches instead of forwarding them', () => {
    const wrongId = resolver([], (_target, link) => ({...link, id: 'TP-C100'}))
    expect(() =>
      toProductDetailPageDto(clone(tpC120ProductPageInput), wrongId),
    ).toThrow(ProductPageContractError)

    const wrongPath = resolver([], (_target, link) => ({
      ...link,
      path: '/products/tp-c120',
    }))
    expect(() =>
      toProductsHubPageDto(clone(productsHubPageInput), wrongPath),
    ).toThrow(ProductPageContractError)
  })

  it('preserves the exact TP-C120 property values, units, and order', () => {
    const detail = toProductDetailPageDto(
      clone(tpC120ProductPageInput),
      resolver(),
    )
    expect(
      detail.technicalProperties.map(({property, value, unit}) => [
        property,
        value,
        unit,
      ]),
    ).toEqual([
      ['TiO₂ content', '95', '%'],
      ['Rutile content', '99.9', '%'],
      ['Dry L*', '99.4', ''],
      ['Dry b*', '1.00', ''],
      ['Specific gravity', '4.1', 'g/cm3'],
      ['pH', '7.5', ''],
      ['Carbon black undertone (CBU)', '14.0', ''],
      ['Oil absorption', '17', 'g/100 g'],
      ['Mean particle size', '0.27', 'micrometres'],
    ])
  })
})
