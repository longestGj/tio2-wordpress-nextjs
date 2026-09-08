import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {mergeMalaysiaRfqHistoryDraft, toMalaysiaRfqHistoryDraft} from '@/lib/rfq/malaysia-rfq-history'

describe('CONV-RFQ prefill', () => {
  it('accepts only the RES-ORIGIN source and generic interest handoff', () => {
    expect(resolveMalaysiaRfqPrefill({
      source_page: 'RES-ORIGIN',
      interest: 'alternative-origin-sourcing',
      grade_id: 'not-an-approved-grade',
      destination_country: 'x'.repeat(101),
    })).toEqual({
      values: {},
      sourcePageId: 'RES-ORIGIN',
      interest: 'alternative-origin-sourcing',
    })
    expect(resolveMalaysiaRfqPrefill({
      source_page: 'RES-ORIGIN',
      interest: 'origin-proof-guaranteed',
    })).toEqual({values: {}, sourcePageId: 'RES-ORIGIN'})
  })

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

  it.each([
    ['MARKET-EU-ES', 'Spain'],
    ['MARKET-IN-001', 'India'],
    ['MARKET-EU-NL', 'Netherlands'],
    ['MARKET-EU-BE', 'Belgium'],
  ])('accepts %s with only its visible editable destination context', (sourcePageId, destinationCountry) => {
    expect(resolveMalaysiaRfqPrefill({
      source_page_id: sourcePageId,
      destination_country: destinationCountry,
    })).toEqual({values: {destination_country: destinationCountry}, sourcePageId})
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

describe('CONV-RFQ buyer-edit history draft', () => {
  it('keeps fresh Brazil URL prefill but lets the current history entry restore buyer-edited destination', () => {
    const prefill = resolveMalaysiaRfqPrefill({
      source_page_id: 'MARKET-BR-EN',
      destination_country: 'Brazil',
    })
    const draft = toMalaysiaRfqHistoryDraft(prefill, {
      grade_id: '',
      application_id: '',
      quantity_mt: '',
      destination_country: 'Chile',
      destination_port_city: '',
      company_name: '',
      contact_name: '',
      business_email: '',
      phone_whatsapp: '',
      website: '',
      additional_requirements: '',
    })
    expect(mergeMalaysiaRfqHistoryDraft(prefill, draft)).toEqual({
      values: {destination_country: 'Chile'},
      sourcePageId: 'MARKET-BR-EN',
    })
    expect(resolveMalaysiaRfqPrefill({
      source_page_id: 'MARKET-BR-EN',
      destination_country: 'Brazil',
    })).toEqual({values: {destination_country: 'Brazil'}, sourcePageId: 'MARKET-BR-EN'})
  })

  it('does not store personal contact fields in history state', () => {
    const prefill = resolveMalaysiaRfqPrefill({source_page_id: 'MARKET-BR-PT', destination_country: 'Brazil'})
    expect(toMalaysiaRfqHistoryDraft(prefill, {
      grade_id: 'M-350',
      application_id: 'Coatings',
      quantity_mt: '12',
      destination_country: 'Argentina',
      destination_port_city: 'Buenos Aires',
      company_name: 'Private Buyer SA',
      contact_name: 'Ana',
      business_email: 'ana@example.com',
      phone_whatsapp: '+54 11 0000',
      website: 'https://example.com',
      additional_requirements: 'Non-confidential requirement.',
    })).toEqual({
      values: {
        grade_id: 'M-350',
        application_id: 'Coatings',
        destination_country: 'Argentina',
        additional_requirements: 'Non-confidential requirement.',
      },
      sourcePageId: 'MARKET-BR-PT',
    })
  })

  it('preserves an intentional empty value when the buyer clears a URL prefill', () => {
    const prefill = resolveMalaysiaRfqPrefill({
      source_page_id: 'MARKET-BR-EN',
      destination_country: 'Brazil',
    })
    const draft = toMalaysiaRfqHistoryDraft(prefill, {
      grade_id: '',
      application_id: '',
      quantity_mt: '',
      destination_country: '',
      destination_port_city: '',
      company_name: '',
      contact_name: '',
      business_email: '',
      phone_whatsapp: '',
      website: '',
      additional_requirements: '',
    })

    expect(mergeMalaysiaRfqHistoryDraft(prefill, draft).values.destination_country).toBe('')
  })
})
