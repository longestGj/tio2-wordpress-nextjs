import {describe, expect, it} from 'vitest'

import {validateMalaysiaRfqValues, type MalaysiaRfqValues} from '@/lib/rfq/malaysia-rfq-validation'

const valid: MalaysiaRfqValues = {
  grade_id: 'M-350',
  application_id: 'Coatings',
  quantity_mt: '20',
  destination_country: 'Malaysia',
  destination_port_city: '',
  company_name: 'Example Industries',
  contact_name: 'A Buyer',
  business_email: 'buyer@example.com',
  phone_whatsapp: '+60 12 345 6789',
  website: 'https://example.com',
  additional_requirements: '',
}

describe('CONV-RFQ validation', () => {
  it('accepts the exact valid field inventory', () => {
    expect(validateMalaysiaRfqValues(valid)).toEqual({valid: true, errors: {}})
  })

  it.each([
    ['grade_id', '', 'Select a product or grade, or choose “Not sure / Need help.”'],
    ['application_id', '', 'Select an application.'],
    ['quantity_mt', '0', 'Enter a quantity greater than 0.'],
    ['destination_country', '', 'Enter a destination country.'],
    ['destination_country', 'x'.repeat(101), 'Keep the destination country to 100 characters or fewer.'],
    ['destination_port_city', 'x'.repeat(121), 'Keep the destination port or city to 120 characters or fewer.'],
    ['company_name', 'x', 'Enter your company name.'],
    ['company_name', 'x'.repeat(161), 'Keep your company name to 160 characters or fewer.'],
    ['contact_name', 'x', 'Enter your name.'],
    ['contact_name', 'x'.repeat(101), 'Keep your name to 100 characters or fewer.'],
    ['business_email', '', 'Enter your business email.'],
    ['business_email', 'not-an-email', 'Enter a business email in the format name@company.com.'],
    ['phone_whatsapp', 'x'.repeat(41), 'Keep the phone or WhatsApp number to 40 characters or fewer.'],
    ['website', 'example.com', 'Enter a complete website address or remove this optional value.'],
    ['additional_requirements', 'x'.repeat(2001), 'Keep additional requirements to 2,000 characters or fewer.'],
  ] as const)('maps %s to its exact approved error', (field, value, message) => {
    const result = validateMalaysiaRfqValues({...valid, [field]: value})
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual({[field]: message})
  })

  it('rejects stale enum values without inferring a replacement', () => {
    expect(validateMalaysiaRfqValues({...valid, grade_id: 'M-999'}).errors.grade_id)
      .toBe('Select a product or grade, or choose “Not sure / Need help.”')
    expect(validateMalaysiaRfqValues({...valid, application_id: 'Rubber'}).errors.application_id)
      .toBe('Select an application.')
  })
})
