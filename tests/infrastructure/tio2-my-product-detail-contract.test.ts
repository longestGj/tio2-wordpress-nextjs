import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('Product Detail Gate 7 infrastructure boundary', () => {
  it('registers all 14 identities but authorizes only M-350, M-510 and M-896 candidates', async () => {
    const registry = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-identities.json'
    )).default
    expect(registry).toMatchObject({
      reviewId: 'PRODUCT-DETAIL-G7-PCR-02',
      hashAlgorithm: 'sha256-json-recursive-key-sort-v1',
      siteScope: 'tio2-my',
      templateVersion: 'product-detail-v1',
    })
    expect(registry.identities).toHaveLength(14)
    expect(new Set(registry.identities.map((item) => item.pageId))).toHaveLength(14)
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M350_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M350', path: '/products/m-350/'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M510_CANDIDATE')).toEqual([
      expect.objectContaining({
        pageId: 'GRADE-M510',
        path: '/products/m-510/',
        approvedSourceSha256: '09B41E1AB403372495D4BE8DB3DDD1260A710E310327FC289D8D344B05AB095C',
        approvedCanonicalSha256: '706A8962F5B90D857EE2595138CDEDCA4E22A7398F5C18CDCFA8E1E8186C4D22',
      }),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M896_CANDIDATE')).toEqual([
      expect.objectContaining({
        pageId: 'GRADE-M896',
        path: '/products/m-896/',
        approvedSourceSha256: 'BA735FA0570E81F8055C76B7AC7B434498446BBD5540A1F2A32F0A9E6F3EC03A',
        approvedCanonicalSha256: '4049273762F620444A14CEC3ED223C7AC44A0AB73166D058B0B625F73D7F0730',
      }),
    ])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(11)
  })

  it('stores three exact scoped contracts behind one allowlisted projection resolver', () => {
    const phpPath = 'wordpress/plugins/tio2-site-model/includes/product-detail-v01.php'
    const seedPaths = [
      'wordpress/seed/apply-tio2-my-m350-product-detail.php',
      'wordpress/seed/apply-tio2-my-m510-product-detail.php',
      'wordpress/seed/apply-tio2-my-m896-product-detail.php',
    ]
    expect(existsSync(phpPath)).toBe(true)
    for (const path of seedPaths) expect(existsSync(path)).toBe(true)
    const php = readFileSync(phpPath, 'utf8')
    const seeds = seedPaths.map((path) => readFileSync(path, 'utf8')).join('\n')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/product-detail-v01.php';")
    expect(php).toContain('function tio2_my_product_detail_approved_grades')
    expect(php).toContain('tio2-my-product-detail-identities.json')
    expect(php).toContain('function tio2_my_product_detail_canonical_sha256')
    expect(php).toContain("'sha256-json-recursive-key-sort-v1'")
    expect(php).toContain("'approvedCanonicalSha256'")
    expect(php).toContain("'approvedSourceSha256'")
    expect(php).toContain('tio2_my_product_detail_approved_hash_mismatch')
    expect(php).toContain('function tio2_my_product_detail_public_projection')
    expect(php).toContain("'tax_query'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain('hash_equals')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-350'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-510'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-896'")
    expect(seeds.match(/tio2_my_product_detail_approved_grades\(\)/gu)).toHaveLength(3)
    expect(seeds).not.toMatch(/m-895|m-996|m-2196|m-2377|cr-901/iu)
    expect(schema).toContain('malaysiaProductDetailRecordJson(slug: String!): String!')
  })

  it('requires exact LIVE_APPROVED route identity and receiver readiness', () => {
    const resolver = readFileSync(
      'wordpress/plugins/tio2-site-model/includes/product-hub-v01.php',
      'utf8',
    )
    const seeds = ['m350', 'm510', 'm896'].map((grade) => readFileSync(
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
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M896'")
    expect(seeds.match(/TIO2_MY_ROUTE_RELEASE_STATE_META, 'PREVIEW_ONLY'/gu)).toHaveLength(3)
    expect(seeds).not.toContain("TIO2_MY_ROUTE_RELEASE_STATE_META, 'LIVE_APPROVED'")
  })

  it('does not create standalone route files or seeded records for the other 11 grades', () => {
    const files = [
      'app/products/m-896/page.tsx',
      'app/products/m-996/page.tsx',
      'app/products/m-2196/page.tsx',
      'wordpress/seed/apply-tio2-my-product-details.php',
    ]
    for (const file of files) expect(existsSync(file)).toBe(false)
    const route = readFileSync('app/products/[familySlug]/page.tsx', 'utf8')
    expect(route).toContain('APPROVED_MALAYSIA_PRODUCT_DETAIL_SLUGS')
    expect(route).toContain('isApprovedMalaysiaProductDetailSlug')
    expect(route).not.toMatch(/m-896|m-895|m-996|m-2196|m-2377|cr-901/iu)
    expect(existsSync('wordpress/seed/apply-tio2-my-m895-product-detail.php')).toBe(false)
  })

  it('derives route, DTO, types, cache and PHP authorization without local slug allowlists', () => {
    const derivedFiles = [
      'app/products/[familySlug]/page.tsx',
      'lib/wordpress/product-detail-v01-types.ts',
      'lib/wordpress/product-detail-v01-dto.ts',
      'lib/wordpress/cache-tags.ts',
      'wordpress/plugins/tio2-site-model/includes/product-detail-v01.php',
    ]
    for (const path of derivedFiles) {
      const source = readFileSync(path, 'utf8')
      expect(source, path).not.toMatch(/['"]m-(?:350|510|896)['"]/u)
    }
  })

  it('keeps restricted relationships and commerce fields out of the public contract', () => {
    const contract = ['m350', 'm510', 'm896'].map((grade) => readFileSync(
      `wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-${grade}.json`,
      'utf8',
    )).join('\n')
    for (const prohibited of [
      'Rubber', 'Specialty Materials', 'M996_VS_M2196', 'NO_PUBLIC_MAPPING',
      'Offer', 'AggregateRating', 'isSimilarTo', 'manufacturer', 'countryOfOrigin',
      'tio2-a', 'tio2-b', 'TIOVAR', 'Contact',
    ]) expect(contract).not.toContain(prohibited)
  })

  it('pins the M-896 visual, application and technical semantic deltas', async () => {
    const contract = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m896.json'
    )).default
    expect(Object.keys(contract.hero.visual)).toEqual(['label', 'technicalFile', 'currentData', 'note'])
    expect(contract.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(contract.hero.actions.some(({targetPageId}) => targetPageId === 'CONV-DOC')).toBe(false)
    expect(contract.applications.items).toHaveLength(6)
    expect(contract.applications.items.every(({category}) => category === 'Coatings')).toBe(true)
    expect(contract.technical.columns).toEqual(['Property', 'Value', 'Test method'])
    expect(contract.technical.rows).toHaveLength(11)
    expect(contract.technical.rows.every(({value, testMethod}) => Boolean(value && testMethod))).toBe(true)
    expect(contract).not.toHaveProperty('relatedGrades')
    expect(contract).not.toHaveProperty('originSupport')
    expect(contract).not.toHaveProperty('notRecommended')
  })
})
