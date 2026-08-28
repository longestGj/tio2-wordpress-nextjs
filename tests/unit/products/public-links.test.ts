import {describe, expect, it} from 'vitest'

import {toProductPageDto} from '@/lib/products/dto'
import {applyProductPublicRoutePolicy} from '@/lib/products/public-links'
import {validProductPageInput} from '@/tests/fixtures/product-page'

describe('Product publication guard', () => {
  it('preserves every protected relationship label while removing unauthorized hrefs', () => {
    const product = toProductPageDto(validProductPageInput)
    const protectedProduct = applyProductPublicRoutePolicy(product, 'tio2-a')

    expect(
      protectedProduct.recommendedApplications.map(({title, href}) => ({
        title,
        href,
      })),
    ).toEqual(
      product.recommendedApplications.map(({title}) => ({
        title,
        href: undefined,
      })),
    )
    expect(protectedProduct.relatedLinks).toEqual({
      applications: product.relatedLinks.applications.map(({title}) => ({
        title,
      })),
      products: product.relatedLinks.products.map(({title}) => ({title})),
      resources: product.relatedLinks.resources.map(({title}) => ({title})),
    })
  })
})
