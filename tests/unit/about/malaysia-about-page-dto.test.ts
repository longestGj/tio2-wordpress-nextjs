import {describe, expect, it} from 'vitest'

import {CrossSiteContentError} from '@/lib/wordpress/types'
import {AboutPageContractError, toMalaysiaAboutPageDto} from '@/lib/wordpress/about-page-v01-dto'
import {malaysiaAboutPageSource} from '@/tests/fixtures/tio2-my-about-page'

describe('ABOUT-001 DTO', () => {
  it('accepts only the exact approved singleton projection', () => {
    const dto = toMalaysiaAboutPageDto(malaysiaAboutPageSource())
    expect(dto.identity).toMatchObject({siteId: 'tio2-my', path: '/about', status: 'publish'})
    expect(dto.globalChrome.navigation.find(({targetPageId}) => targetPageId === 'ABOUT-001')?.href).toBe('/about/')
  })

  it('rejects cross-scope and modified contracts', () => {
    expect(() => toMalaysiaAboutPageDto(malaysiaAboutPageSource({scope: 'tio2-a'}))).toThrow(CrossSiteContentError)
    expect(() => toMalaysiaAboutPageDto(malaysiaAboutPageSource({tamper: true}))).toThrow(AboutPageContractError)
  })
})
