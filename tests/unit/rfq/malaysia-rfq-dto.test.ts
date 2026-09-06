import {describe, expect, it} from 'vitest'

import {RfqPageContractError, toMalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-dto'
import {CrossSiteContentError} from '@/lib/wordpress/types'
import {malaysiaRfqPageSource} from '@/tests/fixtures/tio2-my-rfq-page'

describe('CONV-RFQ DTO isolation', () => {
  it('projects one approved scoped singleton and the one shared Chrome config', () => {
    const dto = toMalaysiaRfqPageDto(malaysiaRfqPageSource())
    expect(dto.identity).toMatchObject({
      pageId: 'CONV-RFQ', siteScope: 'tio2-my', path: '/request-a-quote/', status: 'publish',
    })
    expect(dto.globalChrome.siteScope).toBe('tio2-my')
    expect(dto.globalChrome.rfq.href).toBe('/request-a-quote/')
  })

  it('accepts the approved JSON file payload with its final newline', () => {
    const source = malaysiaRfqPageSource()
    const dto = toMalaysiaRfqPageDto({
      ...source,
      malaysiaRfqPageContractJson: `${source.malaysiaRfqPageContractJson}\n`,
    })
    expect(dto.identity.pageId).toBe('CONV-RFQ')
  })

  it('fails closed for foreign scope, wrong route or modified contract', () => {
    expect(() => toMalaysiaRfqPageDto(malaysiaRfqPageSource({siteScopes: {nodes: [{slug: 'tio2-a'}]}})))
      .toThrow(CrossSiteContentError)
    expect(() => toMalaysiaRfqPageDto(malaysiaRfqPageSource({publishingFields: {publicPath: '/contact'}})))
      .toThrow(RfqPageContractError)
    expect(() => toMalaysiaRfqPageDto(malaysiaRfqPageSource({malaysiaRfqPageContractJson: '{}'})))
      .toThrow(RfqPageContractError)
  })
})
