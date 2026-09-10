import {describe, expect, it} from 'vitest'

import {emptyMalaysiaContactValues, validateMalaysiaContactValues} from '@/lib/contact/malaysia-contact-validation'

const valid = {
  full_name: ' Amina  Tan ', company: ' Example  Co ', business_email: ' amina@example.com ',
  country_region: ' Malaysia ', subject: ' Partnership ', message: ' General business inquiry. ',
}

describe('CONTACT-001 validation', () => {
  it('accepts the exact six-field boundary contract without changing the entered values', () => {
    expect(validateMalaysiaContactValues(valid)).toEqual({})
    expect(validateMalaysiaContactValues({
      full_name: '界'.repeat(100), company: '界'.repeat(160), business_email: `${'a'.repeat(242)}@example.com`,
      country_region: '界'.repeat(100), subject: '界'.repeat(120), message: '界'.repeat(2000),
    })).toEqual({})
  })

  it('returns exact required, format and over-limit messages', () => {
    expect(validateMalaysiaContactValues(emptyMalaysiaContactValues)).toEqual({
      full_name: 'Enter your full name.', company: 'Enter your company name.',
      business_email: 'Enter your business email.', country_region: 'Enter your country or region.',
      subject: 'Enter a subject.', message: 'Enter your message.',
    })
    expect(validateMalaysiaContactValues({
      full_name: 'a'.repeat(101), company: 'a'.repeat(161), business_email: 'not-an-email',
      country_region: 'a'.repeat(101), subject: 'a'.repeat(121), message: 'a'.repeat(2001),
    })).toEqual({
      full_name: 'Keep your name to 100 characters or fewer.',
      company: 'Keep your company name to 160 characters or fewer.',
      business_email: 'Enter a valid email address, such as name@company.com.',
      country_region: 'Keep your country or region to 100 characters or fewer.',
      subject: 'Keep the subject to 120 characters or fewer.',
      message: 'Keep your message to 2,000 characters or fewer.',
    })
  })
})
