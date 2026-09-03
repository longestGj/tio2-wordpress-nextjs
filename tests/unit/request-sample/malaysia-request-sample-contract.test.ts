import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-sample.json'

describe('Malaysia Request Sample approved contract', () => {
  it('locks the route, scope, composition and critical copy', () => {
    expect(contract.identity).toEqual({
      pageId: 'CONV-SAMPLE', siteScope: 'tio2-my', locale: 'en',
      path: '/request-sample/', schemaVersion: 'request-sample-v0.1-malaysia',
    })
    expect(contract.moduleOrder).toEqual([
      'global_header', 'breadcrumb', 'hero', 'prefill_context', 'sample_request',
      'human_review', 'faq', 'global_footer',
    ])
    expect(contract.hero.h1).toBe('Request a Titanium Dioxide Sample for Technical Evaluation')
    expect(contract.form.privacyNotice).toBe('We use the information you provide to review and respond to your sample request. Learn more in our Privacy Policy.')
    expect(contract.form.privacyHref).toBe('/privacy-policy/')
    expect(contract.form.submitLabel).toBe('Submit Sample Request for Review')
    expect(contract.form.fields.map(({key}) => key)).toEqual([
      'grade_id', 'application_id', 'application_other', 'test_objective',
      'current_grade_or_target', 'contact_name', 'company_organisation',
      'business_email', 'destination_country_market', 'expected_project_annual_use',
      'documents_needed', 'additional_context',
    ])
    expect(contract.form.gradeOptions).toHaveLength(15)
    expect(contract.form.applicationOptions.map(({value}) => value)).not.toContain('rubber')
    expect(contract.schema.allowedTypes).toEqual(['WebPage', 'BreadcrumbList'])
    expect(contract.releaseControls.indexingAuthorized).toBe(false)
  })

  it('wires a non-null scope-bound WordPress record', () => {
    const php = readFileSync('wordpress/plugins/tio2-site-model/includes/request-sample-v01.php', 'utf8')
    expect(php).toContain("'post_type' => 'tio2_request_sample'")
    expect(php).toContain("'taxonomy' => 'site_scope'")
    expect(php).toContain("'terms' => ['tio2-my']")
    expect(php).toContain("'type' => ['non_null' => 'String']")
    expect(php).toContain('throw new \\GraphQL\\Error\\UserError')
    expect(php).not.toContain('tiovar')
  })
})
