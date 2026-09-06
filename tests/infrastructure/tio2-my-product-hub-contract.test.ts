import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const contractPath = 'wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'
const phpPath = 'wordpress/plugins/tio2-site-model/includes/product-hub-v01.php'
const seedPath = 'wordpress/seed/apply-tio2-my-product-hub.php'
const queryPath = 'lib/wordpress/product-hub-v01-queries.ts'
const pagePath = 'app/(en)/products/page.tsx'

describe('PRODUCT-000 immutable Malaysia Hub contract', () => {
  it('locks the approved identity, directory and relationship counts', async () => {
    const contract = (await import(
      '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-hub.json'
    )).default

    expect(contract).toMatchObject({
      reviewId: 'PRODUCT-000-G7-PCR-04',
      identity: {
        pageId: 'PRODUCT-000', siteScope: 'tio2-my', locale: 'en',
        path: '/products/', schemaVersion: 'product-hub-v0.1-malaysia',
      },
      seo: {
        title: 'Titanium Dioxide Pigment Grades | TiO2 Malaysia',
        canonical: 'https://tio2malaysia.com/products/',
      },
      globalChromeRef: {contractId: 'GLOBAL-CHROME-005'},
    })
    const grades = contract.directory.groups.flatMap((group) => group.grades)
    expect(contract.directory.groups.map((group) => group.grades.length)).toEqual([6, 5, 2, 1])
    expect(grades).toHaveLength(14)
    expect(new Set(grades.map((grade) => grade.gradeId))).toHaveLength(14)
    expect(contract.selector.applications.slice(0, 6).map((item) => item.gradeIds.length)).toEqual([8, 8, 7, 4, 2, 1])
    expect(contract.selector.applications[6]).toMatchObject({label: 'Not Sure', gradeIds: []})
    expect(contract.process.classifications.map((item) => item.gradeIds.length)).toEqual([8, 5, 1])
    expect(contract.evaluation.items).toHaveLength(5)
    expect(contract.buyerQuestions).toHaveLength(5)
  })

  it('contains no prohibited relation, claim, commerce or cross-scope fallback', () => {
    expect(existsSync(contractPath)).toBe(true)
    const serialized = readFileSync(contractPath, 'utf8')
    for (const prohibited of [
      'Rubber', 'tio2-a', 'tio2-b', 'TIOVAR', 'mytio2', 'Offer',
      'AggregateOffer', 'AggregateRating', 'Buy Now', 'Add to Cart',
      'M996_VS_M2196', 'NO_PUBLIC_MAPPING',
    ]) {
      expect(serialized).not.toContain(prohibited)
    }
  })

  it('registers one non-null, scope-bound CMS record and readiness resolver', () => {
    expect(existsSync(phpPath)).toBe(true)
    expect(existsSync(seedPath)).toBe(true)
    const php = readFileSync(phpPath, 'utf8')
    const seed = readFileSync(seedPath, 'utf8')
    const plugin = readFileSync('wordpress/plugins/tio2-site-model/tio2-site-model.php', 'utf8')
    const schema = readFileSync('wordpress/schema.graphql', 'utf8')

    expect(plugin).toContain("require_once __DIR__ . '/includes/product-hub-v01.php';")
    expect(php).toContain('function tio2_resolve_malaysia_product_hub_record_json(): string')
    expect(php).toContain('malaysiaProductHubRecordJson')
    expect(php).toContain("'tio2-my'")
    expect(php).toContain('hash_equals')
    expect(php).toContain('routeReadiness')
    expect(php).toContain('TIO2_MY_ROUTE_PAGE_ID_META')
    expect(php).toContain('TIO2_MY_ROUTE_CANONICAL_META')
    expect(php).toContain('TIO2_MY_ROUTE_RELEASE_STATE_META')
    expect(php).toContain("'LIVE_APPROVED'")
    expect(php).toContain('TIO2_MY_RECEIVER_STATE_META')
    expect(php).toContain("str_replace(' ', 'T'")
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')
    expect(php).not.toContain("'tio2-a'")
    expect(php).not.toContain("'tio2-b'")
    expect(seed).toContain("'tio2-my-products'")
    expect(seed).toContain("'/products'")
    expect(schema).toContain('malaysiaProductHubRecordJson: String!')
  })

  it('uses a dedicated cache namespace and branches before Site A lookup', () => {
    expect(existsSync(queryPath)).toBe(true)
    const query = readFileSync(queryPath, 'utf8')
    const page = readFileSync(pagePath, 'utf8')
    expect(query).toContain("siteTag('tio2-my')")
    expect(query).toContain("routeTag('tio2-my', '/products')")
    expect(query).toContain("productHubContentTag('tio2-my')")
    expect(query).toContain('Promise<MalaysiaProductHubDto>')
    expect(page).toContain("site.id === 'tio2-my'")
    expect(page).toContain('getMalaysiaProductHub')
  })
})
