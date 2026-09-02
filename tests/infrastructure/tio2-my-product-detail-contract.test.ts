import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

describe('Product Detail Gate 7 infrastructure boundary', () => {
  it('registers all 14 identities but authorizes only the nine approved candidates', async () => {
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
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M895_CANDIDATE')).toEqual([
      expect.objectContaining({
        pageId: 'GRADE-M895',
        path: '/products/m-895/',
        approvedSourceSha256: 'CCBAB8EF7BEBB5641F409CF0925E861D57990EB53186448473754E88B48E3A5A',
        approvedCanonicalSha256: 'C05AFEDE37CD69B5DA4AE5E77C3749093CCD7DEBC004424800FE870747C68E11',
      }),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M340_CANDIDATE')).toEqual([
      expect.objectContaining({
        pageId: 'GRADE-M340',
        path: '/products/m-340/',
        approvedSourceSha256: '8DF979421B4D716BA82E910A42F62BF4982102BF00D82DB2782578F5B5AB93A6',
        approvedCanonicalSha256: '313F39434C74E7219A759E4A3A7F177047BA705ADF88F6441CB3B615E9852B3E',
      }),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M886_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M886', path: '/products/m-886/', approvedSourceSha256: 'D4A68225CC29B06D9B9700DB5CFA9C8D74C154C49E643A450A24B759981267B0', approvedCanonicalSha256: '9CDDABD077B99163262B77644D9C939CED343B50C3F014869F5A798254DB40B8'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M52_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M52', path: '/products/m-52/', approvedSourceSha256: '977A72AF33377F7A3CAB12C4F72314E93CFD79F2BE0CCFCFD62A3A2D009DE1A7', approvedCanonicalSha256: '625C28008CAB44E95062A145897BC7E7B1E1565664AA86161CF9CB79E18EC1C4'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M108_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M108', path: '/products/m-108/', approvedSourceSha256: '998C57D70AC303C0F47AC3E14B0C9214F4D53BC91130044274773B7CD3260BFF', approvedCanonicalSha256: '0579A4F1E452AB6609FAB529D86C07B1DD717039F8B8AAD9DAB37412AC0BF84B'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState === 'APPROVED_M210_CANDIDATE')).toEqual([
      expect.objectContaining({pageId: 'GRADE-M210', path: '/products/m-210/', approvedSourceSha256: 'F977D5DD3C49119966CD3C4EC5E846448BBFBD5BE1F4846B82B8CD1CBA6463B2', approvedCanonicalSha256: 'F2CEDE18EFA0ADE179C4D5BAC72BEB25A2E8A826A825C0344757D04ABC4B8B94'}),
    ])
    expect(registry.identities.filter((item) => item.implementationState.startsWith('IDENTITY_ONLY'))).toHaveLength(5)
  })

  it('stores nine exact scoped contracts behind one allowlisted projection resolver', () => {
    const phpPath = 'wordpress/plugins/tio2-site-model/includes/product-detail-v01.php'
    const seedPaths = [
      'wordpress/seed/apply-tio2-my-m350-product-detail.php',
      'wordpress/seed/apply-tio2-my-m510-product-detail.php',
      'wordpress/seed/apply-tio2-my-m896-product-detail.php',
      'wordpress/seed/apply-tio2-my-m895-product-detail.php',
      'wordpress/seed/apply-tio2-my-m340-product-detail.php',
      'wordpress/seed/apply-tio2-my-m886-product-detail.php',
      'wordpress/seed/apply-tio2-my-m52-product-detail.php',
      'wordpress/seed/apply-tio2-my-m108-product-detail.php',
      'wordpress/seed/apply-tio2-my-m210-product-detail.php',
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
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-895'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-340'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-886'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-52'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-108'")
    expect(seeds).toContain("$internal_slug = 'tio2-my-m-210'")
    expect(seeds.match(/tio2_my_product_detail_approved_grades\(\)/gu)).toHaveLength(9)
    expect(seeds).not.toMatch(/m-200|m-996|m-2196|m-2377|cr-901/iu)
    expect(schema).toContain('malaysiaProductDetailRecordJson(slug: String!): String!')
  })

  it('requires exact LIVE_APPROVED route identity and receiver readiness', () => {
    const resolver = readFileSync(
      'wordpress/plugins/tio2-site-model/includes/product-hub-v01.php',
      'utf8',
    )
    const seeds = ['m350', 'm510', 'm896', 'm895', 'm340', 'm886', 'm52', 'm108', 'm210'].map((grade) => readFileSync(
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
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M895'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M340'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M886'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M52'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M108'")
    expect(seeds).toContain("TIO2_MY_ROUTE_PAGE_ID_META, 'GRADE-M210'")
    expect(seeds.match(/TIO2_MY_ROUTE_RELEASE_STATE_META, 'PREVIEW_ONLY'/gu)).toHaveLength(9)
    expect(seeds).not.toContain("TIO2_MY_ROUTE_RELEASE_STATE_META, 'LIVE_APPROVED'")
  })

  it('does not create standalone route files or seeded records for the other five grades', () => {
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
    expect(route).not.toMatch(/m-896|m-895|m-340|m-996|m-2196|m-2377|cr-901/iu)
    expect(existsSync('wordpress/seed/apply-tio2-my-m200-product-detail.php')).toBe(false)
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
      expect(source, path).not.toMatch(/['"]m-(?:52|108|210|340|350|510|886|895|896)['"]/u)
    }
  })

  it('keeps restricted relationships and commerce fields out of the public contract', () => {
    const contract = ['m350', 'm510', 'm896', 'm895', 'm340', 'm886', 'm52', 'm108', 'm210'].map((grade) => readFileSync(
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

  it('pins the M-895 three-application and typical-value semantic deltas', async () => {
    const contract = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m895.json'
    )).default
    expect(Object.keys(contract.hero.visual)).toEqual(['label', 'technicalFile', 'currentData', 'note'])
    expect(contract.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(contract.applications.items).toHaveLength(3)
    expect(contract.applications.items.every(({category}) => category === 'Coatings')).toBe(true)
    expect(contract.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(contract.technical.rows).toHaveLength(11)
    expect(contract.technical.note).toContain('within 48 hours of production')
    expect(contract).not.toHaveProperty('relatedGrades')
    expect(contract).not.toHaveProperty('originSupport')
  })

  it('pins the M-340 application categories and fourteen-row legacy table', async () => {
    const contract = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m340.json'
    )).default
    expect(contract.hero.actions.map(({targetPageId}) => targetPageId)).toEqual(['CONV-RFQ', 'CONV-SAMPLE'])
    expect(contract.applications.items.map(({category}) => category)).toEqual([
      'Masterbatch', 'Plastics', 'Plastics', 'Plastics', 'Plastics',
    ])
    expect(JSON.stringify(contract)).not.toMatch(/Rubber/iu)
    expect(contract.technical.columns).toEqual(['Technical index', 'Standard', 'Typical value'])
    expect(contract.technical.rows).toHaveLength(14)
    expect(contract.technical.rows.every(({standard, typical}) => Boolean(standard && typical))).toBe(true)
    expect(contract).not.toHaveProperty('relatedGrades')
    expect(contract).not.toHaveProperty('originSupport')
  })

  it('pins the M-886 application boundary and ten-row visible-value table', async () => {
    const contract = (await import('@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m886.json')).default
    expect(contract.applications.items.map(({category}) => category)).toEqual(['Masterbatch', 'Plastics', 'Plastics'])
    expect(JSON.stringify(contract)).not.toMatch(/Footwear|Coatings|11\/2024/iu)
    expect(contract.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(contract.technical.rows).toHaveLength(10)
    expect(contract.technical.rows.every(({value, testMethod}) => Boolean(value && testMethod))).toBe(true)
    expect(contract.technical.note).toContain('within 48 hours of production')
  })

  it('pins the M-52 Sulfate, application and eleven-row visible-value boundary', async () => {
    const contract = (await import('@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m52.json')).default
    expect(contract.hero.eyebrow).toContain('SULFATE PROCESS')
    expect(contract.applications.items.map(({category}) => category)).toEqual(['Printing Inks', 'Coatings', 'Coatings'])
    expect(JSON.stringify(contract)).not.toMatch(/Plastics|Masterbatch|Paper|Specialty/iu)
    expect(contract.evaluation.groups).toHaveLength(2)
    expect(contract.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(contract.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(contract.technical.rows).toHaveLength(11)
    expect(contract.technical.rows.every(({value, testMethod}) => Boolean(value && testMethod))).toBe(true)
    expect(contract.technical.note).toContain('within 48 hours of production')
  })

  it('pins the M-108 public-version, application and ten-row boundary', async () => {
    const contract = (await import('@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m108.json')).default
    expect(contract.hero.eyebrow).toContain('SULFATE PROCESS')
    expect(contract.applications.items.map(({category}) => category)).toEqual(['Masterbatch', 'Plastics', 'Plastics'])
    expect(contract.applications.items.map(({title}) => title)).toEqual([
      'Masterbatch and Compounds', 'Polyolefin and PVC Film', 'Plastics Requiring High Thermal Stability',
    ])
    expect(JSON.stringify(contract)).not.toMatch(/2023V3|V3 2023|Coatings|Printing Inks|Paper|Specialty Materials/iu)
    expect(contract.evaluation.groups).toHaveLength(2)
    expect(contract.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(contract.technical.columns).toEqual(['Property', 'Typical value', 'Test method'])
    expect(contract.technical.rows).toHaveLength(10)
    expect(contract.technical.rows.every(({value, testMethod}) => Boolean(value && testMethod))).toBe(true)
    expect(contract.technical.note).toContain('within 48 hours of production')
  })

  it('pins the M-210 printed-version and two-column twelve-row boundary', async () => {
    const contract = (await import('@/wordpress/plugins/tio2-site-model/config/tio2-my-product-detail-m210.json')).default
    expect(contract.hero.eyebrow).toContain('CHLORIDE PROCESS')
    expect(contract.hero.proofs).toContain('M-210 TDS · V3 2023')
    expect(contract.applications.items.map(({category}) => category)).toEqual(['Masterbatch', 'Plastics', 'Plastics'])
    expect(contract.applications.items.map(({title}) => title)).toEqual([
      'Polyolefin Masterbatch', 'Engineering Plastics: PE, PP and ABS', 'PS and Its Copolymers',
    ])
    expect(JSON.stringify(contract)).not.toMatch(/FDA|food.contact|Rubber|Coatings|Printing Inks|Paper|Specialty Materials/iu)
    expect(contract.evaluation.groups).toHaveLength(2)
    expect(contract.evaluation.groups.flatMap(({items}) => items)).toHaveLength(8)
    expect(contract.technical.columns).toEqual(['Property', 'Typical value'])
    expect(contract.technical.rows).toHaveLength(12)
    expect(contract.technical.rows.every((row) => !('testMethod' in row) && Boolean(row.value))).toBe(true)
  })
})
