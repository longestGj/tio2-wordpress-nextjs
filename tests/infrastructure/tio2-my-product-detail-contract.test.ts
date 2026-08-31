import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('Product Detail Gate 7 infrastructure boundary', () => {
  it('registers all 14 identities but authorizes only the M-350 implementation candidate', async () => {
    const registry = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-identities.json'
    )).default
    expect(registry).toMatchObject({
      reviewId: 'PRODUCT-DETAIL-G7-PCR-02',
      siteScope: 'tio2-my',
      templateVersion: 'product-detail-v1',
    })
    expect(registry.identities).toHaveLength(14)
    expect(new Set(registry.identities.map((item) => item.pageId))).toHaveLength(14)
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M350_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M350', path: '/products/m-350/'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(13)
  })

  it('stores one exact scoped M-350 contract and returns only a filtered public projection', () => {
    const phpPath = 'wordpress/plugins/tio2-site-model/includes/product-detail-v01.php'
    const seedPath = 'wordpress/seed/apply-tio2-my-m350-product-detail.php'
    expect(existsSync(phpPath)).toBe(true)
    expect(existsSync(seedPath)).toBe(true)
    const php = readFileSync(phpPath, 'utf8')
    const seed = readFileSync(seedPath, 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/product-detail-v01.php';")
    expect(php).toContain('function tio2_my_product_detail_public_projection')
    expect(php).toContain("'m-350' !== $slug")
    expect(php).toContain("'tax_query'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain('hash_equals')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seed).toContain("$internal_slug = 'tio2-my-m-350'")
    expect(seed).not.toMatch(/m-510|m-896|m-996|m-2196/iu)
    expect(schema).toContain('malaysiaProductDetailRecordJson(slug: String!): String!')
  })

  it('does not create route files, shells or seeded records for the other 13 grades', () => {
    const files = [
      'app/products/m-510/page.tsx',
      'app/products/m-896/page.tsx',
      'app/products/m-996/page.tsx',
      'app/products/m-2196/page.tsx',
      'wordpress/seed/apply-tio2-my-product-details.php',
    ]
    for (const file of files) expect(existsSync(file)).toBe(false)
    const route = readFileSync('app/products/[familySlug]/page.tsx', 'utf8')
    expect(route).toContain("familySlug !== 'm-350'")
    expect(route).not.toMatch(/getMalaysiaProductDetail\((?!'m-350')/u)
  })

  it('keeps restricted relationships and commerce fields out of the public contract', () => {
    const contract = readFileSync(
      'wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m350.json',
      'utf8',
    )
    for (const prohibited of [
      'Rubber', 'Specialty Materials', 'M996_VS_M2196', 'NO_PUBLIC_MAPPING',
      'Offer', 'AggregateRating', 'isSimilarTo', 'manufacturer', 'countryOfOrigin',
      'tio2-a', 'tio2-b', 'TIOVAR', 'Contact',
    ]) expect(contract).not.toContain(prohibited)
  })
})
