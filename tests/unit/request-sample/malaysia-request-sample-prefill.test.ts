import {describe, expect, it} from 'vitest'

import {resolveMalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'

describe('Malaysia sample prefill', () => {
  it('accepts only registered visible values with approved provenance', () => {
    expect(resolveMalaysiaSamplePrefill({
      source_page_id: 'GRADE-M2377', grade_id: 'M-2377', application_id: 'coatings',
      process_context: 'sulfate', destination: 'United Kingdom', document_needs: ['tds', 'coa'],
    })).toEqual(expect.objectContaining({
      grade_id: 'M-2377', application_id: 'coatings', process_context: 'sulfate',
      destination: 'United Kingdom', documents_needed: ['tds', 'coa'],
    }))
  })

  it('discards stale, unapproved and cross-relation values neutrally', () => {
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'TIOVAR-HOME', grade_id: 'M-2377'})).toEqual({})
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'GRADE-M2377', grade_id: 'M-2377', application_id: 'specialty_materials'})).toEqual(expect.not.objectContaining({application_id: 'specialty_materials'}))
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'GRADE-M2377', application_id: 'specialty_materials'})).toEqual({source_page_id:'GRADE-M2377'})
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'GRADE-M2377', grade_id:'M-350', application_id:'coatings', process_context:'chloride'})).toEqual({source_page_id:'GRADE-M2377'})
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'GRADE-M2377', grade_id:'M-2377', application_id:'not_sure'})).toEqual(expect.not.objectContaining({application_id:'not_sure'}))
    expect(resolveMalaysiaSamplePrefill({source_page_id:'APP-COAT',application_id:'plastics'})).toEqual({source_page_id:'APP-COAT'})
    expect(resolveMalaysiaSamplePrefill({source_page_id:'MARKET-UK-001',market_id:'MARKET-EU-DE'})).toEqual({source_page_id:'MARKET-UK-001'})
    expect(resolveMalaysiaSamplePrefill({source_page_id:'PRODUCT-000',grade_id:'M-350',application_id:'masterbatch',process_context:'sulfate'})).toEqual(expect.not.objectContaining({application_id:'masterbatch',process_context:'sulfate'}))
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'GRADE-M2377', application_id: 'rubber'})).toEqual(expect.not.objectContaining({application_id: 'rubber'}))
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'MARKET-MY-GUESSED', market_id: 'MARKET-MY-GUESSED'})).toEqual({})
    expect(resolveMalaysiaSamplePrefill({source_page_id: 'RES-000', resource_context: 'RESOURCE-GUESSED'})).toEqual({source_page_id: 'RES-000'})
  })

  it('bounds free text and document values', () => {
    const result = resolveMalaysiaSamplePrefill({source_page_id: 'MARKET-000', destination: 'x'.repeat(121), document_needs: ['tds', 'nope']})
    expect(result.destination).toBeUndefined()
    expect(result.documents_needed).toEqual(['tds'])
  })

  it('maps registered market and resource IDs to approved buyer-visible labels',()=>{
    expect(resolveMalaysiaSamplePrefill({source_page_id:'MARKET-000',market_id:'MARKET-UK-001'})).toEqual(expect.objectContaining({market_id:'MARKET-UK-001',destination:'United Kingdom'}))
    expect(resolveMalaysiaSamplePrefill({source_page_id:'GRADE-M2377',grade_id:'M-2377',resource_context:'RES-ORIGIN'})).toEqual(expect.objectContaining({resource_context:'RES-ORIGIN',resource_context_label:'Alternative-origin sourcing considerations'}))
  })
})
