import {afterEach, describe, expect, it, vi} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-en.json'
import {toMalaysiaBrazilEnMarketPageDto} from '@/lib/wordpress/market-page-brazil-en-v01-dto'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'

function source(payload: unknown = contract) {
  return {
    id: 'brazil-en-1',
    modifiedGmt: '2026-09-08T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/brazil'},
    malaysiaBrazilEnMarketContractJson: JSON.stringify(payload),
  }
}

afterEach(() => vi.unstubAllEnvs())

describe('Brazil EN CMS contract', () => {
  it('returns the exact approved identity, module order and per-instance targets', () => {
    const page = toMalaysiaBrazilEnMarketPageDto(source())
    expect(page.identity).toEqual({
      pageId: 'MARKET-BR-EN', siteScope: 'tio2-my', locale: 'en',
      path: '/markets/brazil/', schemaVersion: 'market-brazil-en-v0.1',
    })
    expect(page.seo.canonical).toBe('https://tio2malaysia.com/markets/brazil/')
    expect(page.modules.map(module => module.id)).toEqual(['BR-EN-01', 'BR-EN-02', 'BR-EN-03', 'BR-EN-04', 'BR-EN-05'])
    expect(page.modules[1]?.cards.map(card => card.action.targetPageId)).toEqual(['APP-COAT', 'APP-PLAS', 'APP-MB'])
    expect(page.modules[0]?.actions.map(action => action.context ?? null)).toEqual([
      {sourcePageId: 'MARKET-BR-EN', destinationCountry: 'Brazil'},
      null,
    ])
    expect(page.modules[2]?.actions.map(action => action.context ?? null)).toEqual([
      {sourcePageId: 'MARKET-BR-EN'}, null,
    ])
  })

  it.each(['tio2-a', 'tio2-b', ''])('rejects foreign or absent scope %s', scope => {
    const siteScopes = {nodes: scope ? [{slug: scope}] : []}
    expect(() => toMalaysiaBrazilEnMarketPageDto({...source(), siteScopes})).toThrow()
  })

  it.each(['draft', 'private', 'future'])('rejects non-published status %s', status => {
    expect(() => toMalaysiaBrazilEnMarketPageDto({...source(), status})).toThrow()
  })

  it('rejects ambiguous scope, wrong path, invalid time and absent payload', () => {
    const patches = [
      {siteScopes: {nodes: [{slug: 'tio2-my'}, {slug: 'tio2-a'}]}},
      {publishingFields: {publicPath: '/markets/poland'}},
      {modifiedGmt: '2026-02-31T01:02:03'},
      {malaysiaBrazilEnMarketContractJson: 'null'},
    ]
    for (const patch of patches) {
      expect(() => toMalaysiaBrazilEnMarketPageDto({...source(), ...patch})).toThrow()
    }
  })

  it('rejects reordered modules, foreign actions, markup, hidden fields and wrong canonical', () => {
    const variants: Array<(payload: typeof contract) => void> = [
      payload => { payload.modules.reverse() },
      payload => { payload.modules[0]!.actions[0]!.href = 'https://evil.example/' },
      payload => { payload.modules[0]!.heading = '<script>alert(1)</script>' },
      payload => { Object.assign(payload, {internalApproval: 'secret'}) },
      payload => { payload.seo.canonical = 'https://tio2products.com/markets/brazil/' },
    ]
    for (const mutate of variants) {
      const payload = structuredClone(contract)
      mutate(payload)
      expect(() => toMalaysiaBrazilEnMarketPageDto(source(payload))).toThrow()
    }
  })

  it.each([' ', '\u00a0', '\ufeff'])('rejects boundary whitespace %j', whitespace => {
    for (const value of [whitespace + 'Editorial text', 'Editorial text' + whitespace, whitespace]) {
      const payload = structuredClone(contract)
      payload.modules[0]!.heading = value
      expect(() => toMalaysiaBrazilEnMarketPageDto(source(payload))).toThrow()
    }
  })

  it('uses a valid CMS revision without falling back to initial JSON', () => {
    const payload = structuredClone(contract)
    payload.modules[3]!.paragraphs[0] = 'A scoped editorial revision supplied by WordPress.'
    const page = toMalaysiaBrazilEnMarketPageDto(source(payload))
    expect(page.modules[3]?.paragraphs[0]).toBe('A scoped editorial revision supplied by WordPress.')
  })
})

describe('Brazil EN receiver context remains page-scoped', () => {
  it('accepts only the approved RFQ source and editable Brazil destination', () => {
    expect(resolveMalaysiaRfqPrefill({
      source_page_id: 'MARKET-BR-EN', destination_country: 'Brazil',
    })).toEqual({values: {destination_country: 'Brazil'}, sourcePageId: 'MARKET-BR-EN'})
  })

  it('passes only source attribution to Request Documents', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      source_page_id: 'MARKET-BR-EN',
    })).toEqual({values: {}, sourcePageId: 'MARKET-BR-EN', marketId: null, prefillVisible: false})
  })
})
