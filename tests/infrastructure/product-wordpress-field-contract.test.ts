import {existsSync, readFileSync} from 'node:fs'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

const productFieldsPath = fileURLToPath(
  new URL('../../wordpress/plugins/tio2-site-model/includes/product-fields.php', import.meta.url),
)

const approvedProductFields = [
  'product_id',
  'family',
  'meta_title',
  'meta_description',
  'eyebrow',
  'customer_problem_headline',
  'quick_answer',
  'product_type',
  'process',
  'primary_application',
  'positioning',
  'surface_treatment',
  'packaging',
  'tds_access',
  'fit_when',
  'discuss_first_when',
  'performance_priorities',
  'recommended_applications',
  'evidence_statement',
  'typical_properties',
  'validation_checklist',
  'faq_items',
  'related_links',
] as const

const approvedSharedFields = [
  'inquiry_fields',
  'request_tds_cta',
  'discuss_application_cta',
  'technical_disclaimer',
] as const

const forbiddenFields = [
  'source_model',
  'last_reviewed',
  'reviewer',
  'manufacturer',
  'legal_entity',
  'tds_url',
  'download_url',
] as const

describe('Site A Product WordPress field contract', () => {
  it('declares only the approved Product and shared-setting concepts', () => {
    expect(existsSync(productFieldsPath), 'Product field module is missing').toBe(true)

    const source = readFileSync(productFieldsPath, 'utf8')
    for (const fieldName of [...approvedProductFields, ...approvedSharedFields]) {
      expect(source).toContain(`'name' => '${fieldName}'`)
    }
    for (const fieldName of forbiddenFields) {
      expect(source).not.toContain(`'name' => '${fieldName}'`)
    }
  })

  it('keeps Product fields out of Site B content types', () => {
    const source = readFileSync(productFieldsPath, 'utf8')

    expect(source).toContain("'value' => 'tio2_product'")
    expect(source).not.toContain("'value' => 'tio2_homepage'")
    expect(source).not.toContain("'value' => 'tio2_grade'")
    expect(source).not.toContain("'value' => 'tio2_application'")
    expect(source).not.toContain("'value' => 'tio2_document'")
    expect(source).not.toContain("'value' => 'tio2_faq'")
  })
})
