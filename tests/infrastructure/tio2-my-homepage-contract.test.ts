import {existsSync, readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const contractPath =
  'wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'
const phpPath =
  'wordpress/plugins/tio2-site-model/includes/homepage-v04.php'
const seedPath = 'wordpress/seed/apply-tio2-my-homepage.php'

const contractText = existsSync(contractPath)
  ? readFileSync(contractPath, 'utf8')
  : '{}'
const contract = JSON.parse(contractText) as Record<string, any>
const php = existsSync(phpPath) ? readFileSync(phpPath, 'utf8') : ''
const plugin = readFileSync(
  'wordpress/plugins/tio2-site-model/tio2-site-model.php',
  'utf8',
)
const fields = readFileSync(
  'wordpress/plugins/tio2-site-model/includes/fields.php',
  'utf8',
)
const preview = readFileSync(
  'wordpress/plugins/tio2-site-model/includes/preview.php',
  'utf8',
)
const seed = existsSync(seedPath) ? readFileSync(seedPath, 'utf8') : ''

describe('HOME-001 immutable WordPress contract', () => {
  it('exists as the sole scope-bound Malaysia Homepage payload', () => {
    expect(existsSync(contractPath)).toBe(true)
    expect(contract).toMatchObject({
      packageId: 'HOME-001-G7-HANDOFF-01',
      identity: {
        pageId: 'HOME-001',
        siteScope: 'tio2-my',
        locale: 'en',
        path: '/',
        schemaVersion: 'homepage-v0.4-malaysia',
      },
      seo: {
        title: 'Malaysia Titanium Dioxide Supplier | TiO₂ Malaysia',
        description:
          'Explore titanium dioxide grades, applications, destination markets and document request paths through TiO₂ Malaysia for international industrial buyers.',
        canonical: 'https://tio2malaysia.com/',
        robots: 'index, follow',
        h1: 'Malaysia Titanium Dioxide for Industrial Buyers',
      },
    })
  })

  it('preserves the exact 6/5/2/1 product grouping with 14 unique IDs', () => {
    const groups = contract.products?.groups ?? []
    const ids = groups.flatMap((group: {gradeIds: string[]}) => group.gradeIds)

    expect(groups.map((group: {gradeIds: string[]}) => group.gradeIds.length)).toEqual([
      6, 5, 2, 1,
    ])
    expect(ids).toEqual([
      'M-350',
      'M-510',
      'M-896',
      'M-996',
      'M-2196',
      'M-895',
      'M-200',
      'M-108',
      'M-210',
      'M-340',
      'M-886',
      'M-52',
      'M-2377',
      'CR-901',
    ])
    expect(new Set(ids).size).toBe(14)
  })

  it('keeps provisional Application and candidate process routes unresolved', () => {
    expect(contract.applications?.items).toHaveLength(5)
    expect(
      contract.applications?.items.map(
        (item: {targetPageId: string; href: string | null; mappingState: string}) => ({
          targetPageId: item.targetPageId,
          href: item.href,
          mappingState: item.mappingState,
        }),
      ),
    ).toEqual([
      {targetPageId: 'APP-COAT', href: null, mappingState: 'PROVISIONAL_URL'},
      {targetPageId: 'APP-PLAS', href: null, mappingState: 'PROVISIONAL_URL'},
      {targetPageId: 'APP-MB', href: null, mappingState: 'PROVISIONAL_URL'},
      {targetPageId: 'APP-INK', href: null, mappingState: 'PROVISIONAL_URL'},
      {targetPageId: 'APP-PAPER', href: null, mappingState: 'PROVISIONAL_URL'},
    ])
    expect(contract.resources?.topics[1]).toMatchObject({
      targetPageId: 'RES-PROC',
      href: null,
      mappingState: 'PAGE_AND_ROUTE_NOT_APPROVED',
    })
  })

  it('contains exactly the approved five-node and five-relation graph', () => {
    const graph = contract.schemaGraph?.['@graph'] ?? []
    expect(graph).toHaveLength(5)
    expect(graph.map((node: {'@type': string}) => node['@type'])).toEqual([
      'WebSite',
      'WebPage',
      'Organization',
      'Brand',
      'Product',
    ])
    const source = JSON.stringify(contract.schemaGraph)
    expect(source.match(/"manufacturer"/gu)).toHaveLength(1)
    expect(source).not.toContain('"Organization","brand"')
    for (const prohibited of [
      'Offer',
      'ItemList',
      'FAQPage',
      'ContactPoint',
      'PostalAddress',
      'sameAs',
      'ProductGroup',
      'countryOfOrigin',
      'price',
      'inventory',
      'availability',
      'rating',
      'GTIN',
    ]) {
      expect(source).not.toContain(prohibited)
    }
  })

  it('exposes only a hidden, byte-validated GraphQL contract for tio2-my', () => {
    expect(existsSync(phpPath)).toBe(true)
    expect(php).toContain("'_tio2_my_homepage_contract_json'")
    expect(php).toContain("'malaysiaHomepageContractJson'")
    expect(php).toContain("'tio2-my'")
    expect(php).toContain('hash_equals')
    expect(php).not.toContain('acf_add_local_field')
    expect(plugin).toContain("require_once __DIR__ . '/includes/homepage-v04.php';")
    expect(fields).toContain("'homepage-v0.4-malaysia' => tio2_validate_homepage_v04_contract($post_id)")
    expect(preview).toContain('tio2_serialize_homepage_v04_preview')
  })

  it('provides an idempotent local seed for only tio2-my--homepage', () => {
    expect(existsSync(seedPath)).toBe(true)
    expect(seed).toContain("'tio2-my--homepage'")
    expect(seed).toContain("'tio2-my'")
    expect(seed).toContain("'_tio2_my_homepage_contract_json'")
    expect(seed).not.toContain("'tio2-a'")
    expect(seed).not.toContain("'tio2-b'")
  })
})
