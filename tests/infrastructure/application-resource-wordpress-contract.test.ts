import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const pluginRoot = fileURLToPath(
  new URL('../../wordpress/plugins/tio2-site-model/', import.meta.url),
)
const fieldsPath = `${pluginRoot}/includes/application-resource-fields.php`
const contractPath = `${pluginRoot}/includes/application-resource-contract.php`
const publicationPath = `${pluginRoot}/includes/application-resource-publication.php`
const pluginPath = `${pluginRoot}/tio2-site-model.php`
const contentTypesPath = `${pluginRoot}/includes/content-types.php`

interface ExpectedField {
  key: string
  name: string
  type: string
  required: 0 | 1
  min?: number
  max?: number
  maxlength?: number
  postType?: string
}

const applicationFields: ExpectedField[] = [
  {key: 'id', name: 'application_id', type: 'text', required: 1, maxlength: 80},
  {key: 'level', name: 'application_level', type: 'select', required: 1},
  {key: 'family', name: 'family', type: 'text', required: 1, maxlength: 120},
  {key: 'parent_application', name: 'parent_application', type: 'relationship', required: 0, max: 1, postType: 'tio2_application'},
  {key: 'meta_title', name: 'meta_title', type: 'text', required: 1, maxlength: 60},
  {key: 'meta_description', name: 'meta_description', type: 'textarea', required: 1, maxlength: 160},
  {key: 'eyebrow', name: 'eyebrow', type: 'text', required: 1, maxlength: 80},
  {key: 'headline', name: 'headline', type: 'textarea', required: 1, maxlength: 180},
  {key: 'direct_answer', name: 'direct_answer', type: 'wysiwyg', required: 1},
  {key: 'context', name: 'application_context', type: 'textarea', required: 1},
  {key: 'buyer_problem', name: 'buyer_problem', type: 'textarea', required: 1},
  {key: 'selection_factors', name: 'selection_factors', type: 'repeater', required: 1, min: 3, max: 6},
  {key: 'powder_data_limits', name: 'powder_data_limits', type: 'textarea', required: 1},
  {key: 'validation_plan', name: 'validation_plan', type: 'repeater', required: 1, min: 1, max: 6},
  {key: 'customer_inputs', name: 'customer_inputs', type: 'repeater', required: 1, min: 1, max: 6},
  {key: 'body_sections', name: 'body_sections', type: 'repeater', required: 1, min: 2, max: 12},
  {key: 'faq_items', name: 'faq_items', type: 'repeater', required: 1, min: 4, max: 6},
  {key: 'child_applications', name: 'child_applications', type: 'relationship', required: 0, max: 24, postType: 'tio2_application'},
  {key: 'related_applications', name: 'related_applications', type: 'relationship', required: 0, max: 24, postType: 'tio2_application'},
  {key: 'related_resources', name: 'related_resources', type: 'relationship', required: 0, max: 24, postType: 'tio2_document'},
  {key: 'related_products', name: 'related_products', type: 'relationship', required: 0, max: 24, postType: 'tio2_product'},
  {key: 'ctas', name: 'ctas', type: 'repeater', required: 1, min: 1, max: 3},
  {key: 'technical_disclaimer', name: 'technical_disclaimer', type: 'wysiwyg', required: 1},
]

const resourceFields: ExpectedField[] = [
  {key: 'id', name: 'resource_id', type: 'text', required: 1, maxlength: 80},
  {key: 'kind', name: 'resource_kind', type: 'select', required: 1},
  {key: 'cluster', name: 'cluster', type: 'text', required: 1, maxlength: 120},
  {key: 'meta_title', name: 'meta_title', type: 'text', required: 1, maxlength: 60},
  {key: 'meta_description', name: 'meta_description', type: 'textarea', required: 1, maxlength: 160},
  {key: 'eyebrow', name: 'eyebrow', type: 'text', required: 1, maxlength: 80},
  {key: 'headline', name: 'headline', type: 'textarea', required: 1, maxlength: 180},
  {key: 'direct_answer', name: 'direct_answer', type: 'wysiwyg', required: 1},
  {key: 'key_takeaways', name: 'key_takeaways', type: 'repeater', required: 1, min: 1, max: 8},
  {key: 'sections', name: 'sections', type: 'repeater', required: 1, min: 2, max: 20},
  {key: 'comparison_table', name: 'comparison_table', type: 'group', required: 0},
  {key: 'practical_implications', name: 'practical_implications', type: 'repeater', required: 1, min: 1, max: 12},
  {key: 'common_mistakes', name: 'common_mistakes', type: 'repeater', required: 1, min: 1, max: 12},
  {key: 'evaluation_method', name: 'evaluation_method', type: 'repeater', required: 1, min: 1, max: 12},
  {key: 'faq_items', name: 'faq_items', type: 'repeater', required: 1, min: 4, max: 6},
  {key: 'child_resources', name: 'child_resources', type: 'relationship', required: 0, max: 24, postType: 'tio2_document'},
  {key: 'related_applications', name: 'related_applications', type: 'relationship', required: 0, max: 24, postType: 'tio2_application'},
  {key: 'related_resources', name: 'related_resources', type: 'relationship', required: 0, max: 24, postType: 'tio2_document'},
  {key: 'related_products', name: 'related_products', type: 'relationship', required: 0, max: 24, postType: 'tio2_product'},
  {key: 'ctas', name: 'ctas', type: 'repeater', required: 1, min: 1, max: 2},
  {key: 'technical_disclaimer', name: 'technical_disclaimer', type: 'wysiwyg', required: 1},
]

function fieldBlock(source: string, prefix: 'application' | 'resource', key: string): string {
  const marker = `'key' => 'field_tio2_${prefix}_${key}'`
  const start = source.indexOf(marker)
  expect(start, `${marker} is missing`).toBeGreaterThanOrEqual(0)
  const next = source.indexOf("'key' => 'field_tio2_", start + marker.length)
  return source.slice(start, next < 0 ? source.length : next)
}

function expectField(source: string, prefix: 'application' | 'resource', expected: ExpectedField) {
  const block = fieldBlock(source, prefix, expected.key)
  expect(block).toContain(`'name' => '${expected.name}'`)
  expect(block).toContain(`'type' => '${expected.type}'`)
  expect(block).toContain(`'required' => ${expected.required}`)
  expect(block).toContain("'show_in_graphql' => 1")
  for (const bound of ['min', 'max', 'maxlength'] as const) {
    if (expected[bound] !== undefined) expect(block).toContain(`'${bound}' => ${expected[bound]}`)
  }
  if (expected.postType) {
    expect(block).toContain(`'post_type' => ['${expected.postType}']`)
    expect(block).toContain("'filters' => ['search']")
    expect(block).toContain("'return_format' => 'id'")
  }
}

describe('Site A Application and Technical Resource WordPress contract', () => {
  it('registers the exact top-level ACF field names, types, required flags, and bounds', () => {
    expect(existsSync(fieldsPath), 'Application/Resource field module is missing').toBe(true)
    const source = readFileSync(fieldsPath, 'utf8')
    for (const field of applicationFields) expectField(source, 'application', field)
    for (const field of resourceFields) expectField(source, 'resource', field)
  })

  it('registers exact nested structures, choices, rich-text settings, and GraphQL exposure', () => {
    const source = readFileSync(fieldsPath, 'utf8')
    const keys = [...source.matchAll(/'key'\s*=>\s*'(field_tio2_(?:application|resource)_[^']+)'/gu)]
    expect(keys.length).toBeGreaterThan(applicationFields.length + resourceFields.length)
    for (const match of keys) {
      const start = match.index
      const next = source.indexOf("'key' => 'field_tio2_", start + match[0].length)
      expect(source.slice(start, next < 0 ? source.length : next), match[1]).toContain(
        "'show_in_graphql' => 1",
      )
    }

    for (const key of ['selection_factors_item', 'validation_plan_item', 'customer_inputs_item']) {
      expect(fieldBlock(source, 'application', key)).toContain("'type' => 'textarea'")
    }
    for (const key of ['body_sections_section_id', 'body_sections_heading', 'faq_items_question', 'ctas_label', 'ctas_href']) {
      expect(fieldBlock(source, 'application', key)).toContain("'type' => 'text'")
    }
    for (const key of ['body_sections_html', 'faq_items_answer', 'technical_disclaimer']) {
      const block = fieldBlock(source, 'application', key)
      expect(block).toContain("'type' => 'wysiwyg'")
      expect(block).toContain("'tabs' => 'visual'")
      expect(block).toContain("'toolbar' => 'basic'")
      expect(block).toContain("'media_upload' => 0")
    }

    expect(fieldBlock(source, 'application', 'level')).toContain(
      "'hub' => 'Hub'",
    )
    expect(fieldBlock(source, 'application', 'level')).toContain(
      "'category' => 'Category'",
    )
    expect(fieldBlock(source, 'application', 'level')).toContain(
      "'detail' => 'Detail'",
    )
    for (const kind of ['hub', 'article', 'guide', 'comparison', 'testing-method', 'case-study']) {
      expect(fieldBlock(source, 'resource', 'kind')).toContain(`'${kind}' =>`)
    }
    for (const kind of ['request-tds', 'discuss-application', 'request-sample']) {
      expect(fieldBlock(source, 'application', 'ctas_kind')).toContain(`'${kind}' =>`)
    }
    for (const kind of ['request-tds', 'discuss-application']) {
      expect(fieldBlock(source, 'resource', 'ctas_kind')).toContain(`'${kind}' =>`)
    }

    for (const key of ['key_takeaways_item', 'practical_implications_item', 'common_mistakes_item', 'evaluation_method_item']) {
      expect(fieldBlock(source, 'resource', key)).toContain("'type' => 'textarea'")
    }
    for (const key of ['sections_section_id', 'sections_heading', 'comparison_table_columns_label', 'comparison_table_rows_cells_value']) {
      expect(fieldBlock(source, 'resource', key)).toContain("'type' => 'text'")
    }
    for (const key of ['sections_html', 'faq_items_answer', 'technical_disclaimer']) {
      const block = fieldBlock(source, 'resource', key)
      expect(block).toContain("'type' => 'wysiwyg'")
      expect(block).toContain("'tabs' => 'visual'")
      expect(block).toContain("'toolbar' => 'basic'")
      expect(block).toContain("'media_upload' => 0")
    }
  })

  it('scopes both user-facing field groups to the matching type and exact Site A taxonomy rule', () => {
    const source = readFileSync(fieldsPath, 'utf8')
    expect(source).toContain("'title' => 'Application'")
    expect(source).toContain("'title' => 'Technical Resource'")
    expect(source).toMatch(/'value'\s*=>\s*'tio2_application'[\s\S]*?'param'\s*=>\s*'post_taxonomy'[\s\S]*?'value'\s*=>\s*'site_scope:tio2-a'/u)
    expect(source).toMatch(/'value'\s*=>\s*'tio2_document'[\s\S]*?'param'\s*=>\s*'post_taxonomy'[\s\S]*?'value'\s*=>\s*'site_scope:tio2-a'/u)
    expect(source).not.toContain('site_id')
    expect(source).not.toContain('site_scope:tio2-b')
  })

  it('excludes private evidence, reviewer, source, download, manufacturer, and legal fields', () => {
    const source = readFileSync(fieldsPath, 'utf8')
    const fieldNames = [...source.matchAll(/'name'\s*=>\s*'([^']+)'/gu)].map((match) => match[1]!)
    for (const forbiddenToken of [
      'evidence',
      'reviewer',
      'source',
      'download',
      'manufacturer',
      'legal',
    ]) {
      expect(fieldNames.some((name) => name.split('_').includes(forbiddenToken))).toBe(false)
    }
    expect(fieldNames).not.toContain('tds_url')
  })

  it('wires exact-scope hierarchy, stable post-ID relationship, draft-only, and GraphQL guards without changing shared CPT labels', () => {
    for (const path of [contractPath, publicationPath]) {
      expect(existsSync(path), `${path} is missing`).toBe(true)
    }
    const contract = readFileSync(contractPath, 'utf8')
    const publication = readFileSync(publicationPath, 'utf8')
    const plugin = readFileSync(pluginPath, 'utf8')
    const contentTypes = readFileSync(contentTypesPath, 'utf8')

    expect(contract).toContain('function tio2_validate_application_record(int $post_id): array')
    expect(contract).toContain('function tio2_validate_resource_record(int $post_id): array')
    expect(contract).toContain("['tio2-a']")
    expect(contract).toContain("'applications-hub'")
    expect(contract).toContain("'universal-multi-application'")
    expect(contract).toContain("'resources-hub'")
    expect(contract).toContain("'/resources/'")
    expect(contract).toContain("'post_type'")
    expect(contract).toContain("'site_scope'")

    expect(publication).toContain(
      'function tio2_application_resource_publication_allowed(WP_Post $post): bool',
    )
    expect(publication).toContain("['publish', 'future']")
    expect(publication).toContain('graphql_pre_model_data_is_private')
    expect(publication).toContain('get_current_user_id()')
    expect(plugin).toContain("require_once __DIR__ . '/includes/application-resource-fields.php'")
    expect(plugin).toContain("require_once __DIR__ . '/includes/application-resource-contract.php'")
    expect(plugin).toContain("require_once __DIR__ . '/includes/application-resource-publication.php'")
    expect(plugin).toContain("add_action('acf/init', 'tio2_register_application_resource_acf_fields')")
    expect(plugin).toContain("add_action('acf/save_post', 'tio2_save_application_resource_contract_feedback'")
    expect(plugin).toContain("add_filter('wp_insert_post_data', 'tio2_guard_application_resource_publication'")
    expect(plugin).toContain("add_filter('graphql_pre_model_data_is_private', 'tio2_application_resource_graphql_visibility'")

    expect(contentTypes).toContain("'singular' => 'TiO2 Application'")
    expect(contentTypes).toContain("'singular' => 'TiO2 Document'")
    expect(contentTypes).toContain("'public' => ! $is_product")
  })
})
