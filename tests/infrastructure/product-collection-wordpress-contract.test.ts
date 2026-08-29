import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const pluginRoot = fileURLToPath(
  new URL('../../wordpress/plugins/tio2-site-model/', import.meta.url),
)
const fieldsPath = `${pluginRoot}/includes/product-collection-fields.php`
const contractPath = `${pluginRoot}/includes/product-collection-contract.php`
const pluginPath = `${pluginRoot}/tio2-site-model.php`

const hubKeys = [
  'metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer', 'heroImage',
  'decisionRail', 'families', 'knownGradeHeading', 'knownGradeHelp', 'decisionPath',
  'applicationBoundary', 'resources', 'enquiry', 'faqItems', 'technicalDisclaimer',
]
const familyKeys = [
  'metaTitle', 'metaDescription', 'eyebrow', 'headline', 'directAnswer', 'heroImage',
  'decisionRail', 'filters', 'comparisonIntroduction', 'comparisonCaption',
  'selectionMethod', 'validationSteps', 'applications', 'resources', 'enquiry',
  'faqItems', 'technicalDisclaimer',
]
const collectionKeys = [
  'familyDisplayOrder', 'familyCardSummary', 'collectionApplicationFocus',
  'collectionPerformanceFocus', 'collectionSurfaceTreatmentPositioning',
  'collectionFilterTags',
]

function fieldNames(source: string): string[] {
  return [...source.matchAll(/'name'\s*=>\s*'([^']+)'/gu)].map((match) => match[1]!)
}

describe('Site A Product collection WordPress contract', () => {
  it('defines only the requested Site A Hub, Family, and Product collection field surfaces', () => {
    expect(existsSync(fieldsPath), 'Product collection field module is missing').toBe(true)
    const source = readFileSync(fieldsPath, 'utf8')
    expect(source).toContain('function tio2_product_hub_field_definitions(): array')
    expect(source).toContain('function tio2_product_family_field_definitions(): array')
    expect(source).toContain('function tio2_product_collection_display_field_definitions(): array')
    for (const key of [...hubKeys, ...familyKeys, ...collectionKeys]) {
      expect(source).toContain(`'${key}'`)
    }
    expect(source).toContain("'key' => 'group_tio2_product_hub_fields'")
    expect(source).toContain("'key' => 'group_tio2_product_family_fields'")
    expect(source).toContain("'key' => 'group_tio2_product_collection_display_fields'")
    expect(source).toMatch(/'param'\s*=>\s*'post_taxonomy'[\s\S]*?'value'\s*=>\s*'site_scope:tio2-a'/u)
    expect(source).not.toContain('site_scope:tio2-b')
    for (const forbidden of [
      'tdsUrl', 'downloadUrl', 'source', 'supplier', 'manufacturer', 'legal', 'reviewer',
      'evidence', 'price', 'stock', 'MOQ', 'url', 'count', 'path',
    ]) {
      expect(fieldNames(source)).not.toContain(forbidden)
    }
  })

  it('keeps the collection registrars and validators wired into the Site A model', () => {
    expect(existsSync(contractPath), 'Product collection contract module is missing').toBe(true)
    const contract = readFileSync(contractPath, 'utf8')
    const plugin = readFileSync(pluginPath, 'utf8')
    for (const signature of [
      'function tio2_validate_products_hub_contract(string $site_id)',
      'function tio2_validate_product_family_contract(int $term_id)',
      'function tio2_product_family_slug_for_post(int $post_id)',
      'function tio2_product_canonical_path(int $post_id)',
    ]) expect(contract).toContain(signature)
    expect(plugin).toContain("require_once __DIR__ . '/includes/product-collection-fields.php'")
    expect(plugin).toContain("require_once __DIR__ . '/includes/product-collection-contract.php'")
    expect(plugin).toContain("add_action('acf/init', 'tio2_register_product_collection_fields')")
    expect(contract).toContain("'taxonomy' => 'site_scope'")
    expect(contract).toContain("'terms' => ['tio2-a']")
    expect(contract).toContain('Product collection filters must be configured for the Product Family.')
    expect(contract).toMatch(/'taxonomy'\s*=>\s*'product_family'[\s\S]{0,500}'taxonomy'\s*=>\s*'site_scope'/u)
  })
})
