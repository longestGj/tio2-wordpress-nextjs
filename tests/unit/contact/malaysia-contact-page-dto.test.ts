import {describe, expect, it} from 'vitest'

import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

describe('CONTACT-001 scoped DTO', () => {
  it('accepts the exact published Malaysia identity and approved facts', () => {
    const dto = toMalaysiaContactPageDto(malaysiaContactPageSource())
    expect(dto.identity).toEqual({
      id: 'contact-page-1001', pageId: 'CONTACT-001', siteId: 'tio2-my', locale: 'en',
      path: '/contact', contractVersion: 'contact-page-v0.1-malaysia', status: 'publish',
      modified: '2026-09-10T08:00:00.000Z',
    })
    expect(dto.contactDetails).toMatchObject({
      generalInquiries: {label: 'General Inquiries', value: 'info@tio2malaysia.com'},
      operatingCompany: {label: 'Operating Company', value: 'IKHLAS TITANIUM (MALAYSIA) SDN. BHD.'},
      manufacturingSite: {label: 'Manufacturing Site', value: 'NO.33 Industrial Perusahaan Ringan Tupai, 34000 Taiping, Perak, Malaysia'},
    })
  })

  it.each(['tio2-a', 'tio2-b', ''])(`fails closed for foreign or missing scope %j`, (scope) => {
    expect(() => toMalaysiaContactPageDto(malaysiaContactPageSource({scope}))).toThrow(CrossSiteContentError)
  })

  it('fails closed for wrong path or publication status', () => {
    expect(() => toMalaysiaContactPageDto(malaysiaContactPageSource({path: '/about'}))).toThrow(/publishingFields.publicPath/u)
    expect(() => toMalaysiaContactPageDto(malaysiaContactPageSource({status: 'draft'}))).toThrow(/status/u)
  })

  it.each(['generalInquiries', 'operatingCompany', 'manufacturingSite'] as const)(
    'omits an unapproved %s fact instead of substituting a fallback',
    (fact) => {
      expect(toMalaysiaContactPageDto(malaysiaContactPageSource({mutateFact: fact})).contactDetails[fact]).toBeNull()
      expect(toMalaysiaContactPageDto(malaysiaContactPageSource({omitFact: fact})).contactDetails[fact]).toBeNull()
    },
  )

  it('omits an entirely absent approved fact instead of failing or filling it', () => {
    const source = malaysiaContactPageSource()
    const content = JSON.parse(source.malaysiaContactPageContractJson) as {contactDetails: Record<string, unknown>}
    delete content.contactDetails.manufacturingSite
    expect(toMalaysiaContactPageDto({...source, malaysiaContactPageContractJson: JSON.stringify(content)}).contactDetails.manufacturingSite).toBeNull()
  })
})
