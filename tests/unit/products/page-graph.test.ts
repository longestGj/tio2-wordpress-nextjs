import {describe, expect, it} from 'vitest'

import {
  resolveProductPageIdentity,
  SITE_A_PRODUCT_FAMILIES,
  SITE_A_PRODUCT_IDENTITIES,
} from '@/lib/products/page-graph'

describe('Site A Product page graph', () => {
  it('contains the approved 1 hub, 8 family, and 25 detail inventory', () => {
    expect(SITE_A_PRODUCT_IDENTITIES).toHaveLength(34)
    expect(SITE_A_PRODUCT_FAMILIES.map(({slug, productIds}) => [slug, productIds.length]))
      .toEqual([
        ['coatings', 9], ['plastics-masterbatch', 4],
        ['engineering-plastics', 4], ['decorative-paper', 3],
        ['printing-inks', 2], ['solar-film', 1],
        ['high-purity-functional', 1], ['universal', 1],
      ])
  })

  it('resolves a canonical detail path to its immutable identity', () => {
    expect(resolveProductPageIdentity('/products/coatings/tp-c120')).toMatchObject({
      id: 'TP-C120',
      level: 'detail',
      familySlug: 'coatings',
      productSlug: 'tp-c120',
    })
  })
})
