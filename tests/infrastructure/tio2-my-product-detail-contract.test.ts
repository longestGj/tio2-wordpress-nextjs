import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('Product Detail Gate 7 infrastructure boundary', () => {
  it('registers all 14 identities but authorizes only M-350 and M-510 candidates', async () => {
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
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M510_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M510', path: '/products/m-510/'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(12)
  })

  it('stores exact scoped M-350 and M-510 contracts behind one allowlisted projection resolver', () => {
    const phpPath = 'wordpress/plugins/tio2-site-model/includes/product-detail-v01.php'
    const seedPaths = [
      'wordpress/seed/apply-tio2-my-m350-product-detail.php',
      'wordpress/seed/apply-tio2-my-m510-product-detail.php',
    ]
    expect(existsSync(phpPath)).toBe(true)
    for (const path of seedPaths) expect(existsSync(path)).toBe(true)
    const php = readFileSync(phpPath, 'utf8')
    const seeds = seedPaths.map((path) => readFileSync(path, 'utf8')).join('\n')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/product-detail-v01.php';")
    expect(php).toContain('function tio2_my_product_detail_approved_grades')
    expect(php).toContain('function tio2_my_product_detail_public_projection')
    expect(php).toContain("'m-350' => [")
    expect(php).toContain("'m-510' => [")
    expect(php).toContain("'tax_query'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain('hash_equals')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-350'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-510'")
    expect(seeds).not.toMatch(/m-896|m-996|m-2196|m-2377|cr-901/iu)
    expect(schema).toContain('malaysiaProductDetailRecordJson(slug: String!): String!')
  })

  it('requires exact LIVE_APPROVED route identity and receiver readiness', () => {
    const resolver = readFileSync(
      'wordpress/plugins/tio2-site-model/includes/product-hub-v01.php',
      'utf8',
    )
    const seeds = ['m350', 'm510'].map((grade) => readFileSync(
      `wordpress/seed/apply-tio2-my-${grade}-product-detail.php`,
      'utf8',
    )).join('\n')

    for (const contractToken of [
      'TIO2_MY_ROUTE_PAGE_ID_META',
      'TIO2_MY_ROUTE_CANONICAL_META',
      'TIO2_MY_ROUTE_RELEASE_STATE_META',
      "'LIVE_APPROVED'",
      'TIO2_MY_RECEIVER_STATE_META',
      'TIO2_MY_RECEIVER_TARGET_PAGE_ID_META',
      'TIO2_MY_RECEIVER_FORM_KEY_META',
    ]) expect(resolver).toContain(contractToken)
    expect(resolver).toContain("['tio2-my'] ===")
    expect(resolver).toContain("'publish' === get_post_status")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M350'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M510'")
    expect(seeds.match(/TIO2_MY_ROUTE_RELEASE_STATE_META, 'PREVIEW_ONLY'/gu)).toHaveLength(2)
    expect(seeds).not.toContain("TIO2_MY_ROUTE_RELEASE_STATE_META, 'LIVE_APPROVED'")
  })

  it('does not create route files, shells or seeded records for the other 12 grades', () => {
    const files = [
      'app/products/m-896/page.tsx',
      'app/products/m-996/page.tsx',
      'app/products/m-2196/page.tsx',
      'wordpress/seed/apply-tio2-my-product-details.php',
    ]
    for (const file of files) expect(existsSync(file)).toBe(false)
    const route = readFileSync('app/products/[familySlug]/page.tsx', 'utf8')
    expect(route).toContain("['m-350', 'm-510']")
    expect(route).not.toMatch(/m-896|m-996|m-2196|m-2377|cr-901/iu)
  })

  it('keeps restricted relationships and commerce fields out of the public contract', () => {
    const contract = ['m350', 'm510'].map((grade) => readFileSync(
      `wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-${grade}.json`,
      'utf8',
    )).join('\n')
    for (const prohibited of [
      'Rubber', 'Specialty Materials', 'M996_VS_M2196', 'NO_PUBLIC_MAPPING',
      'Offer', 'AggregateRating', 'isSimilarTo', 'manufacturer', 'countryOfOrigin',
      'tio2-a', 'tio2-b', 'TIOVAR', 'Contact',
    ]) expect(contract).not.toContain(prohibited)
  })
})
