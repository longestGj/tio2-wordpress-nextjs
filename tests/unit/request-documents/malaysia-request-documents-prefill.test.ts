import {describe, expect, it} from 'vitest'

import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'

describe('CONV-DOC prefill normalization', () => {
  it('keeps only allowlisted visible editable values and safe source attribution', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2196', application_industry: 'Coatings',
      document_types: ['safety', 'quality_coa', 'safety'], source_page_id: 'PRODUCT-000',
    })).toEqual({
      values: {product_grade: 'M-2196', application_industry: 'Coatings', document_types: ['safety', 'quality_coa']},
      sourcePageId: 'PRODUCT-000', marketId: null, prefillVisible: true,
    })
  })

  it.each([
    'Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper', 'Sulfate',
  ])('accepts the approved M-2377 %s relationship as editable visible context', (applicationIndustry) => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2377', application_industry: applicationIndustry,
      source_page_id: 'GRADE-M2377',
    })).toEqual({
      values: {product_grade: 'M-2377', application_industry: applicationIndustry},
      sourcePageId: 'GRADE-M2377', marketId: null, prefillVisible: true,
    })
  })

  it.each([
    ['Specialty Materials'], ['Rubber'], ['Unapproved Application'],
  ])('discards unsupported M-2377 %s URL context without describing it as supported', (applicationIndustry) => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2377', application_industry: applicationIndustry,
      source_page_id: 'GRADE-M2377',
    })).toEqual({
      values: {product_grade: 'M-2377'}, sourcePageId: 'GRADE-M2377', marketId: null, prefillVisible: true,
    })
  })

  it('discards a Grade/application group and its attribution when a specific Grade source is mismatched', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-350', application_industry: 'Coatings', source_page_id: 'GRADE-M2377',
    })).toEqual({values: {}, sourcePageId: null, marketId: null, prefillVisible: false})
  })

  it.each([
    ['APP-COAT', 'Coatings', 'Plastics'], ['APP-PLAS', 'Plastics', 'Coatings'],
    ['APP-MB', 'Masterbatch', 'Paper'], ['APP-INK', 'Printing Inks', 'Coatings'],
    ['APP-PAPER', 'Paper', 'Printing Inks'], ['PRODUCT-PROC-CL', 'Chloride', 'Sulfate'],
    ['PRODUCT-PROC-SU', 'Sulfate', 'Chloride'],
  ])('binds specific %s attribution only to its exact visible context', (sourcePageId, allowed, mismatched) => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      application_industry: allowed, source_page_id: sourcePageId,
    })).toMatchObject({values: {application_industry: allowed}, sourcePageId})
    expect(resolveMalaysiaRequestDocumentsPrefill({
      application_industry: mismatched, source_page_id: sourcePageId,
    })).toEqual({values: {}, sourcePageId: null, marketId: null, prefillVisible: false})
  })

  it.each([
    ['M-350', ['Coatings', 'Plastics', 'Printing Inks', 'Paper'], 'Chloride'],
    ['M-510', ['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks'], 'Chloride'],
    ['M-896', ['Coatings'], 'Chloride'], ['M-996', ['Coatings'], 'Sulfate'],
    ['M-2196', ['Coatings'], 'Sulfate'], ['M-895', ['Coatings'], 'Chloride'],
    ['M-200', ['Plastics', 'Masterbatch'], 'Chloride'], ['M-108', ['Plastics', 'Masterbatch'], 'Sulfate'],
    ['M-210', ['Plastics', 'Masterbatch'], 'Chloride'], ['M-340', ['Plastics', 'Masterbatch'], 'Chloride'],
    ['M-886', ['Plastics', 'Masterbatch'], 'Chloride'], ['M-52', ['Coatings', 'Printing Inks'], 'Sulfate'],
    ['M-2377', ['Coatings', 'Plastics', 'Masterbatch', 'Printing Inks', 'Paper'], 'Sulfate'],
    ['CR-901', ['Specialty Materials'], 'Vapor-phase oxidation'],
  ] as const)('enforces every approved PRODUCT V0.3 relation for %s', (grade, applications, process) => {
    const sourcePageId = `GRADE-${grade.replace('-', '')}`
    for (const context of [...applications, process]) {
      expect(resolveMalaysiaRequestDocumentsPrefill({
        product_grade: grade, application_industry: context, source_page_id: sourcePageId,
      })).toMatchObject({values: {product_grade: grade, application_industry: context}, sourcePageId})
    }
  })

  it.each([
    ['M-350', 'Masterbatch'], ['M-510', 'Paper'], ['M-896', 'Plastics'],
    ['M-996', 'Plastics'], ['M-2196', 'Plastics'], ['M-895', 'Plastics'],
    ['M-200', 'Coatings'], ['M-108', 'Coatings'], ['M-210', 'Coatings'],
    ['M-340', 'Coatings'], ['M-886', 'Coatings'], ['M-52', 'Plastics'],
    ['M-2377', 'Specialty Materials'], ['CR-901', 'Coatings'],
  ])('does not expose the no-public %s to %s relationship', (grade, applicationIndustry) => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: grade, application_industry: applicationIndustry,
      source_page_id: `GRADE-${grade.replace('-', '')}`,
    }).values).toEqual({product_grade: grade})
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

  it('keeps only registered and context-consistent Malaysia source identifiers as internal attribution', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id: 'GRADE-M2377', market_id: 'MARKET-EU-DE'})).toMatchObject({
      sourcePageId: null, marketId: 'MARKET-EU-DE', values: {}, prefillVisible: false,
    })
    expect(resolveMalaysiaRequestDocumentsPrefill({source_page_id: 'TIOVAR-001', market_id: 'MARKET-US-001'})).toMatchObject({
      sourcePageId: null, marketId: null,
    })
  })
})
