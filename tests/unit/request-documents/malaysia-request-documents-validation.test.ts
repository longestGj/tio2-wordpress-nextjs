import {describe, expect, it} from 'vitest'

import {
  emptyMalaysiaRequestDocumentsValues,
  validateMalaysiaRequestDocumentsValues,
} from '@/lib/request-documents/malaysia-request-documents-validation'

describe('CONV-DOC validation', () => {
  const valid = {
    ...emptyMalaysiaRequestDocumentsValues,
    full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
    country_region: 'Malaysia', product_grade: 'M-2196', document_types: ['safety'],
  }

  it('maps exact safe errors for every missing required value', () => {
    expect(validateMalaysiaRequestDocumentsValues(emptyMalaysiaRequestDocumentsValues).errors).toEqual({
      full_name: 'Enter your full name.', company: 'Enter your company name.',
      business_email: 'Enter an email in the format name@company.com.',
      country_region: 'Enter your country or region.', product_grade: 'Select a Product Grade.',
      document_types: 'Select at least one Document Type.',
    })
  })

  it('requires notes only when Other is the sole document type and never clears entered text', () => {
    expect(validateMalaysiaRequestDocumentsValues({...valid, document_types: ['other']}).errors.additional_requirements).toBe('Describe the document you need.')
    expect(validateMalaysiaRequestDocumentsValues({...valid, document_types: ['other', 'safety']}).valid).toBe(true)
    expect(validateMalaysiaRequestDocumentsValues({...valid, document_types: ['other'], additional_requirements: 'Supplier declaration'}).valid).toBe(true)
  })

  it('enforces allowlists, email syntax and the 500-character unicode cap', () => {
    expect(validateMalaysiaRequestDocumentsValues({...valid, product_grade: 'Other'}).errors.product_grade).toBe('Select a Product Grade.')
    expect(validateMalaysiaRequestDocumentsValues({...valid, document_types: ['regulatory']}).errors.document_types).toBe('Select at least one Document Type.')
    expect(validateMalaysiaRequestDocumentsValues({...valid, business_email: 'invalid'}).errors.business_email).toBe('Enter an email in the format name@company.com.')
    expect(validateMalaysiaRequestDocumentsValues({...valid, additional_requirements: '界'.repeat(501)}).errors.additional_requirements).toBe('Keep Additional Requirements to 500 characters or fewer.')
  })
})
