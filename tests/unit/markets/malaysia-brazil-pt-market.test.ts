import {describe, expect, it} from 'vitest'
import {readFileSync} from 'node:fs'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json'
import {
  BrazilPtMarketContractError,
  toMalaysiaBrazilPtMarketPageDto,
} from '@/lib/wordpress/market-page-brazil-pt-v02-dto'
import {resolveMalaysiaRfqPrefill} from '@/lib/rfq/malaysia-rfq-prefill'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'

interface MutableContract {
  identity: {siteScope: string; locale: string}
  modules: Array<{
    heading: string
    actions: Array<{context?: {sourcePageId?: string; destinationCountry?: string}}>
  }>
}
type ContractMutation = (value: MutableContract) => void

function source(payload: unknown = contract) {
  return {
    id: 'brazil-pt-1',
    modifiedGmt: '2026-09-08T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/pt-br/markets/brazil'},
    malaysiaBrazilPtMarketContractJson: JSON.stringify(payload),
  }
}

describe('Brazil PT CMS contract', () => {
  it('keeps every initial visible string and destination in the approved clean-copy fixture', () => {
    const approved = readFileSync('tests/fixtures/markets/brazil-pt/approved-copy.md', 'utf8')
    const plain = approved.replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    const visible: string[] = [contract.languageNotice]
    const destinations: string[] = []
    for (const [index, item] of contract.breadcrumb.entries()) {
      visible.push(item.label)
      if (index < contract.breadcrumb.length - 1) destinations.push(item.href)
    }
    for (const contentModule of contract.modules) {
      visible.push(contentModule.heading, ...contentModule.paragraphs, ...contentModule.listItems)
      for (const action of contentModule.actions) { visible.push(action.label); destinations.push(action.href) }
      for (const link of contentModule.inlineLinks) { visible.push(link.label); destinations.push(link.href) }
      for (const card of contentModule.cards) {
        visible.push(card.heading, ...card.paragraphs, card.action.label)
        destinations.push(card.action.href)
      }
    }
    for (const value of new Set(visible)) expect(plain, value).toContain(value)
    for (const href of new Set(destinations)) expect(approved, href).toContain(`](${href})`)
  })

  it('accepts only the approved page identity, module order and receiver contexts', () => {
    const page = toMalaysiaBrazilPtMarketPageDto(source())
    expect(page.identity).toEqual({
      pageId: 'MARKET-BR-PT', siteScope: 'tio2-my', locale: 'pt-BR',
      path: '/pt-br/markets/brazil/', schemaVersion: 'market-brazil-pt-v0.2',
    })
    expect(page.modules.map(contentModule => contentModule.id)).toEqual([
      'BR-PT-01', 'BR-PT-02', 'BR-PT-03', 'BR-PT-04', 'BR-PT-05',
    ])
    expect(page.modules[0]?.actions[0]?.context).toEqual({
      sourcePageId: 'MARKET-BR-PT', destinationCountry: 'Brazil',
    })
    expect(page.modules[2]?.actions[0]?.context).toEqual({sourcePageId: 'MARKET-BR-PT'})
    expect(page.seo.canonical).toBe('https://tio2malaysia.com/pt-br/markets/brazil/')
  })

  const mutations: readonly [string, ContractMutation][] = [
    ['foreign scope', value => { value.identity.siteScope = 'tio2-a' }],
    ['wrong locale', value => { value.identity.locale = 'en' }],
    ['wrong destination', value => {
      const context = value.modules[0]!.actions[0]!.context
      if (context) context.destinationCountry = 'Argentina'
    }],
    ['documents destination leakage', value => {
      const context = value.modules[2]!.actions[0]!.context
      if (context) Object.assign(context, {destinationCountry: 'Brazil'})
    }],
    ['reordered modules', value => { value.modules.reverse() }],
    ['markup in copy', value => { value.modules[0]!.heading = '<script>' }],
  ]

  it.each(mutations)('rejects %s', (_name, mutate) => {
    const value = structuredClone(contract) as unknown as MutableContract
    mutate(value)
    expect(() => toMalaysiaBrazilPtMarketPageDto(source(value))).toThrow(BrazilPtMarketContractError)
  })

  it('rejects draft, wrong public path, ambiguous scope and invalid JSON instead of using fallback copy', () => {
    expect(() => toMalaysiaBrazilPtMarketPageDto({...source(), status: 'draft'})).toThrow(BrazilPtMarketContractError)
    expect(() => toMalaysiaBrazilPtMarketPageDto({...source(), publishingFields: {publicPath: '/markets/brazil'}})).toThrow(BrazilPtMarketContractError)
    expect(() => toMalaysiaBrazilPtMarketPageDto({...source(), siteScopes: {nodes: [{slug: 'tio2-my'}, {slug: 'tio2-a'}]}})).toThrow(BrazilPtMarketContractError)
    expect(() => toMalaysiaBrazilPtMarketPageDto({...source(), malaysiaBrazilPtMarketContractJson: '{'})).toThrow(BrazilPtMarketContractError)
  })
})

describe('Brazil PT receiver context remains page-scoped', () => {
  it('accepts only the approved RFQ source and editable Brazil destination', () => {
    expect(resolveMalaysiaRfqPrefill({
      source_page_id: 'MARKET-BR-PT', destination_country: 'Brazil',
    })).toEqual({values: {destination_country: 'Brazil'}, sourcePageId: 'MARKET-BR-PT'})
  })

  it('passes only source attribution to Request Documents', () => {
    expect(resolveMalaysiaRequestDocumentsPrefill({
      source_page_id: 'MARKET-BR-PT',
    })).toEqual({values: {}, sourcePageId: 'MARKET-BR-PT', marketId: null, prefillVisible: false})
  })
})
