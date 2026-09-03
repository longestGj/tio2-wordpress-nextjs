import {describe, expect, it} from 'vitest'

import {validateMalaysiaSampleRequest} from '@/lib/request-sample/malaysia-request-sample-validation'

const valid = {
  grade_id: 'M-2377', application_id: 'coatings', application_other: '',
  test_objective: 'Evaluate dispersion.', current_grade_or_target: '',
  contact_name: 'Aisha Rahman', company_organisation: 'Example Sdn Bhd',
  business_email: 'aisha@example.com', destination_country_market: 'Malaysia',
  expected_project_annual_use: '', documents_needed: ['tds'], additional_context: '',
}

describe('Malaysia sample request validation', () => {
  it('accepts registered choices and unknown/not-sure states', () => {
    expect(validateMalaysiaSampleRequest(valid)).toEqual({})
    expect(validateMalaysiaSampleRequest({...valid, grade_id: 'unknown', application_id: 'not_sure'})).toEqual({})
  })

  it('returns the exact required and conditional messages', () => {
    expect(validateMalaysiaSampleRequest({...valid, grade_id: '', application_id: '', test_objective: '', contact_name: '', company_organisation: '', business_email: 'bad', destination_country_market: ''})).toEqual(expect.objectContaining({
      grade_id: 'Choose a product grade or select “I do not know the grade”.',
      application_id: 'Choose an application, Other or Not sure.',
      test_objective: 'Describe what you need to evaluate.',
      contact_name: 'Enter your contact name.',
      company_organisation: 'Enter your company or organisation.',
      business_email: 'Enter a business email address in a valid format.',
      destination_country_market: 'Enter your destination country or market.',
    }))
    expect(validateMalaysiaSampleRequest({...valid, application_id: 'other'}).application_other).toBe('Describe the application or choose a different option.')
  })

  it('counts Unicode code points and preserves over-limit input for correction', () => {
    const long = '😀'.repeat(2001)
    const values = {...valid, test_objective: long}
    expect(validateMalaysiaSampleRequest(values).test_objective).toBe('Keep What do you need to evaluate? to 2,000 characters or fewer.')
    expect(values.test_objective).toBe(long)
  })

  it('rejects unregistered documents while accepting buyer-entered independent choices', () => {
    expect(validateMalaysiaSampleRequest({...valid, documents_needed: ['secret']} as typeof valid).documents_needed).toBeDefined()
    expect(validateMalaysiaSampleRequest({...valid, grade_id: 'M-2377', application_id: 'specialty_materials'})).toEqual({})
  })

  it('ignores retained Other text when Other is no longer selected',()=>{
    expect(validateMalaysiaSampleRequest({...valid,application_id:'coatings',application_other:'界'.repeat(501)})).toEqual({})
    expect(validateMalaysiaSampleRequest({...valid,application_id:'other',application_other:'界'.repeat(501)}).application_other).toContain('500')
  })
})
