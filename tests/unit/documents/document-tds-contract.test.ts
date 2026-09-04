import {describe, expect, it} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'
import {toMalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'

const source = (scope = 'tio2-my') => ({
  id: 'document-tds-1',
  modifiedGmt: '2026-09-05T01:02:03',
  status: 'publish',
  siteScopes: {nodes: [{slug: scope}]},
  publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(approvedContract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
})

describe('DOC-TDS approved contract boundary', () => {
  it('accepts the exact scoped payload and preserves the ten-module order', () => {
    const dto = toMalaysiaDocumentTdsDto(source())
    expect(dto.page).toMatchObject({site_scope: 'tio2-my', page_id: 'DOC-TDS', route: '/documents/tds-sds-coa/'})
    expect(dto.modules.map((module) => module.id)).toEqual([
      'hero', 'direct_answer', 'document_choice', 'product_grade', 'comparison',
      'request_checklist', 'request_process', 'buyer_questions', 'related_paths', 'final_cta',
    ])
    expect(dto.routeReadiness).toEqual({'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false})
  })

  it('fails closed for a foreign site_scope', () => {
    expect(() => toMalaysiaDocumentTdsDto(source('tio2-a'))).toThrow(CrossSiteContentError)
  })

  it('fails closed for incomplete route readiness', () => {
    const invalid = {...source(), routeReadiness: {'CONV-DOC': true}}
    expect(() => toMalaysiaDocumentTdsDto(invalid)).toThrow(/routeReadiness/u)
  })
})
