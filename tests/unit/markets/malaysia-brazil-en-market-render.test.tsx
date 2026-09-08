// @vitest-environment jsdom
import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
vi.mock('next/font/google', () => ({Inter: () => ({variable: '--font-brazil-market-test'})}))
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-en.json'
import {toMalaysiaBrazilEnMarketPageDto} from '@/lib/wordpress/market-page-brazil-en-v01-dto'
import {MalaysiaBrazilEnMarketPage} from '@/components/sites/tio2-my/markets/malaysia-brazil-en-market-page'

const page = toMalaysiaBrazilEnMarketPageDto({
  id: 'brazil-en-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets/brazil'},
  malaysiaBrazilEnMarketContractJson: JSON.stringify(contract),
})
afterEach(cleanup)

describe('Brazil EN buyer page', () => {
  it('renders one H1, five approved modules, three application cards and no unapproved surface', () => {
    render(<MalaysiaBrazilEnMarketPage marketPage={page}/>)
    const main = screen.getByRole('main')
    expect(within(main).getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(main.querySelectorAll('section[data-module]')).toHaveLength(5)
    expect(within(main).getAllByRole('heading', {level: 3}).map(node => node.textContent)).toEqual([
      'Coatings', 'Plastics', 'Masterbatch Production',
    ])
    expect(main.querySelector('form,table,details,img')).toBeNull()
    expect(main.textContent).not.toMatch(/CURRENT|NOT_AUTHORIZED|Gate 6|is a recommended Grade for Brazil/u)
    const text = main.textContent ?? ''
    expect(text.indexOf('Review TiO2 for Masterbatch')).toBeLessThan(text.indexOf('Use the Product Hub'))
    expect(text.indexOf('your company details and business contact information.')).toBeLessThan(text.indexOf('After you submit'))
  })

  it('keeps RFQ, Documents and neutral navigation contexts separate by link instance', () => {
    render(<MalaysiaBrazilEnMarketPage marketPage={page}/>)
    const main = screen.getByRole('main')
    const quoteLinks = within(main).getAllByRole('link', {name: 'Request a Quote'})
    expect(quoteLinks.map(link => link.getAttribute('href'))).toEqual([
      '/request-a-quote/?source_page_id=MARKET-BR-EN&destination_country=Brazil',
      '/request-a-quote/?source_page_id=MARKET-BR-EN&destination_country=Brazil',
    ])
    expect(within(main).getByRole('link', {name: 'quotation request'}).getAttribute('href'))
      .toBe('/request-a-quote/?source_page_id=MARKET-BR-EN')
    expect(within(main).getByRole('link', {name: 'Request Documents'}).getAttribute('href'))
      .toBe('/request-documents/?source_page_id=MARKET-BR-EN')
    expect(within(main).getAllByRole('link', {name: /Explore Products|Explore Product Grades|Product Hub/u})
      .every(link => !link.getAttribute('href')?.includes('?'))).toBe(true)
  })
})
