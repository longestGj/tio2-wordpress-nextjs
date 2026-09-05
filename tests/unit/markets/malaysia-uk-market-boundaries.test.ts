import {describe, expect, it} from 'vitest'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {marketPageContentTag} from '@/lib/wordpress/cache-tags'

describe('UK market shared boundaries', () => {
  it('retains editable UK destination and trusted source without guessing a territory or grade', () => {
    expect(resolveMalaysiaRfqPrefill({market: 'United Kingdom', source_page: 'MARKET-UK-001'})).toEqual({
      values: {destination_country: 'United Kingdom'}, sourcePageId: 'MARKET-UK-001',
    })
  })
  it('keeps bare shared RFQ free of market attribution', () => {
    expect(resolveMalaysiaRfqPrefill({})).toEqual({values: {}, sourcePageId: null})
  })
  it('creates UK-only cache identity and rejects other scopes or unapproved markets', () => {
    expect(marketPageContentTag('tio2-my', 'MARKET-UK-001', 'en')).toBe('content:tio2-my--market--MARKET-UK-001--en')
    expect(() => marketPageContentTag('tio2-a', 'MARKET-UK-001', 'en')).toThrow()
    expect(() => marketPageContentTag('tio2-my', 'MARKET-OTHER', 'en')).toThrow()
  })
})
