import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'

describe('CONV-RFQ prefill', () => {
  it('accepts the MARKET-EU-001 approved public aliases as visible editable context', () => {
    expect(resolveMalaysiaRfqPrefill({
      market: 'European Union',
      source_page: 'MARKET-EU-001',
    })).toEqual({
      values: {destination_country: 'European Union'},
      sourcePageId: 'MARKET-EU-001',
    })
  })

  it('projects approved explicit context into visible editable values', () => {
    expect(resolveMalaysiaRfqPrefill({
      grade_id: 'M-2377',
      application_id: 'Coatings',
      destination_country: 'Brazil',
      process_context: 'Sulfate',
      document_needs: ['TDS', 'SDS'],
      resource_context: 'Packaging review',
      source_page_id: 'PRODUCT-000',
    })).toEqual({
      values: {
        grade_id: 'M-2377',
        application_id: 'Coatings',
        destination_country: 'Brazil',
        additional_requirements: 'Sulfate\nTDS; SDS\nPackaging review',
      },
      sourcePageId: 'PRODUCT-000',
    })
  })

  it('discards invalid, broad-region and frozen PRODUCT context without leakage', () => {
    expect(resolveMalaysiaRfqPrefill({
      grade_id: 'M-2377',
      application_id: 'Specialty Materials',
      destination_country: 'x'.repeat(101),
      market_id: 'EUROPEAN_UNION',
      process_context: 'Chloride',
      document_needs: ['price-list'],
      resource_context: '<script>alert(1)</script>',
      source_page_id: 'PRODUCT-M-2377',
    })).toEqual({values: {grade_id: 'M-2377'}, sourcePageId: null})
  })
})
