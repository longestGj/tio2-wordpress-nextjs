import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'

describe('CONV-DOC prefill normalization', () => {
  it('keeps only allowlisted visible editable values and safe source attribution', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2196', application_industry: 'Architectural coatings',
      document_types: ['safety', 'quality_coa', 'safety'], source_page_id: 'PRODUCT-000',
    })).toEqual({
      values: {product_grade: 'M-2196', application_industry: 'Architectural coatings', document_types: ['safety', 'quality_coa']},
      sourcePageId: 'PRODUCT-000', marketId: null, prefillVisible: true,
    })
  })

  it('discards unsupported and malicious input without changing country or document choice from market', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'TIOVAR-999', application_industry: '<script>alert(1)</script>',
      document_types: ['regulatory', 'other'], market_id: 'MY', country_region: 'Malaysia',
      source_page_id: '../../admin',
    })).toEqual({values: {document_types: ['other']}, sourcePageId: null, marketId: null, prefillVisible: true})
  })

  it('omits the prefill review completely when no valid visible values remain', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({market_id: 'MY'})).toEqual({
      values: {}, sourcePageId: null, marketId: null, prefillVisible: false,
    })
  })

  it('keeps only registered Malaysia source and market identifiers as internal attribution', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id: 'GRADE-M2377', market_id: 'MARKET-EU-DE'})).toMatchObject({
      sourcePageId: 'GRADE-M2377', marketId: 'MARKET-EU-DE', values: {}, prefillVisible: false,
    })
    expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id: 'TIOVAR-001', market_id: 'MARKET-US-001'})).toMatchObject({
      sourcePageId: null, marketId: null,
    })
  })
})
