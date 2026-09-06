import {describe, expect, it} from 'vitest'

import {
  buildDocumentTdsRequestHref,
  documentTdsSelectionSummary,
  normalizeDocumentTdsSelection,
} from '@/lib/documents/document-tds-state'

describe('DOC-TDS selection state', () => {
  it('normalizes document types into the approved TDS, SDS, COA order', () => {
    expect(normalizeDocumentTdsSelection(['quality_coa', 'safety', 'safety', 'bad'])).toEqual([
      'safety', 'quality_coa',
    ])
  })

  it('builds one deterministic receiver URL with repeated fields and Grade last', () => {
    expect(buildDocumentTdsRequestHref(['quality_coa', 'technical_product'], 'M-2196')).toBe(
      '/request-documents/?document_types%5B%5D=technical_product&document_types%5B%5D=quality_coa&product_grade=M-2196',
    )
  })

  it('summarizes empty, document-only, Grade-only and combined context exactly', () => {
    expect(documentTdsSelectionSummary([], '')).toBe('No request context selected yet.')
    expect(documentTdsSelectionSummary(['technical_product', 'safety'], '')).toBe('Selected: TDS, SDS')
    expect(documentTdsSelectionSummary([], 'M-2196')).toBe('Product Grade: M-2196')
    expect(documentTdsSelectionSummary(['safety'], 'M-2196')).toBe('Selected: SDS · Product Grade: M-2196')
  })
})
