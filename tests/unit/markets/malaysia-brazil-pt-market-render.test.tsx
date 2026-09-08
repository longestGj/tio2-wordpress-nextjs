// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json'
import {toMalaysiaBrazilPtMarketPageDto} from '@/lib/wordpress/market-page-brazil-pt-v02-dto'
import {MalaysiaBrazilPtMarketPage} from '@/components/sites/tio2-my/markets/malaysia-brazil-pt-market-page'

const page = toMalaysiaBrazilPtMarketPageDto({
  id: 'brazil-pt-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/pt-br/markets/brazil'},
  malaysiaBrazilPtMarketContractJson: JSON.stringify(contract),
})
afterEach(cleanup)

describe('Brazil PT buyer page', () => {
  it('renders the five approved modules in Portuguese with the English-owner notice', () => {
    render(<MalaysiaBrazilPtMarketPage marketPage={page}/>)
    const main = screen.getByRole('main')
    expect(main.getAttribute('lang')).toBe('pt-BR')
    expect(within(main).getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(main.querySelectorAll('section[data-module]')).toHaveLength(5)
    expect(within(main).getAllByRole('heading', {level: 3}).map(node => node.textContent)).toEqual([
      'Tintas e revestimentos', 'Plásticos', 'Produção de masterbatch',
    ])
    expect(within(main).getByText('Os links desta página levam a conteúdos e formulários disponíveis em inglês.')).toBeTruthy()
    expect(main.querySelector('form,table,details,img')).toBeNull()
    expect(main.textContent).not.toMatch(/CURRENT|NOT_AUTHORIZED|Gate 6|é um grade recomendado para o Brasil/u)
    expect(main.querySelectorAll('[lang="en"]')).toHaveLength(7)
  })

  it('keeps RFQ, Documents and neutral navigation contexts separate by link instance', () => {
    render(<MalaysiaBrazilPtMarketPage marketPage={page}/>)
    const main = screen.getByRole('main')
    expect(within(main).getAllByRole('link', {name: 'Solicitar cotação'}).map(link => link.getAttribute('href'))).toEqual([
      '/request-a-quote/?source_page_id=MARKET-BR-PT&destination_country=Brazil',
      '/request-a-quote/?source_page_id=MARKET-BR-PT&destination_country=Brazil',
    ])
    expect(within(main).getByRole('link', {name: 'formulário de cotação'}).getAttribute('href'))
      .toBe('/request-a-quote/?source_page_id=MARKET-BR-PT')
    expect(within(main).getByRole('link', {name: 'Solicitar documentos'}).getAttribute('href'))
      .toBe('/request-documents/?source_page_id=MARKET-BR-PT')
    expect(within(main).getAllByRole('link', {name: /Conhecer os produtos|catálogo/u})
      .every(link => !link.getAttribute('href')?.includes('?'))).toBe(true)
  })
})
