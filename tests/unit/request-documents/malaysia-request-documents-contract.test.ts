import {describe, expect, it} from 'vitest'

import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-request-documents.json'

describe('CONV-DOC approved contract', () => {
  it('freezes identity, module order and exact page copy', () => {
    expect(contract.identity).toEqual({
      pageId: 'CONV-DOC', siteScope: 'tio2-my', locale: 'en',
      path: '/request-documents/', schemaVersion: 'request-documents-v0.1-malaysia',
    })
    expect(contract.moduleOrder).toEqual([
      'global_header', 'breadcrumb', 'hero', 'steps', 'minimum_information',
      'prefill_review', 'your_details', 'request_details', 'review',
      'privacy_submit', 'outcome', 'global_footer',
    ])
    expect(contract.hero).toEqual({
      eyebrow: 'Controlled document request',
      h1: 'Request Documents',
      body: 'Select a product grade and the documentation your team needs, then provide the business details required for review.',
    })
    expect(contract.minimumInformation).toBe('Please do not include passwords, payment details, personal identification numbers or confidential formulations.')
  })

  it('freezes exactly eight fields, 14 grades and five document types', () => {
    expect(contract.form.fields.map((field) => field.key)).toEqual([
      'full_name', 'company', 'business_email', 'country_region', 'product_grade',
      'document_types', 'application_industry', 'additional_requirements',
    ])
    expect(contract.form.gradeOptions).toEqual([
      'M-350', 'M-510', 'M-896', 'M-996', 'M-2196', 'M-895', 'M-200',
      'M-108', 'M-210', 'M-340', 'M-886', 'M-52', 'M-2377', 'CR-901',
    ])
    expect(contract.form.documentTypes.map((item) => item.value)).toEqual([
      'technical_product', 'safety', 'quality_coa',
      'origin_supplier_qualification', 'other',
    ])
  })

  it('keeps SEO, Schema and release controls within the approved boundary', () => {
    expect(contract.seo).toMatchObject({
      title: 'Request Documents | TiO2 Malaysia',
      canonical: 'https://tio2malaysia.com/request-documents/',
      language: 'en', hreflang: [],
    })
    expect(contract.schema.allowedTypes).toEqual(['WebPage', 'BreadcrumbList'])
    expect(contract.releaseControls).toEqual({indexingAuthorized: false})
    expect(JSON.stringify(contract.schema)).not.toMatch(/FAQPage|QAPage|Product|Offer/iu)
    expect(JSON.stringify(contract.form)).not.toMatch(/phone|address|quantity|price|upload|consent/iu)
  })
})
