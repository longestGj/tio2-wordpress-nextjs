// @vitest-environment jsdom
import {cleanup, render} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaCountryMarketPage} from '@/components/sites/tio2-my/markets/malaysia-country-market-page'
import {getMalaysiaCountryMarketContract} from '@/lib/markets/malaysia-country-market-contracts'
import {toMalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-dto'
import type {MalaysiaCountryMarketPageId} from '@/lib/markets/malaysia-country-market-contracts'

afterEach(cleanup)

function dto(pageId: MalaysiaCountryMarketPageId) {
  const contract = getMalaysiaCountryMarketContract(pageId)
  return toMalaysiaCountryMarketPageDto(pageId, {
    id: `market-${pageId}`, modifiedGmt: '2026-09-08T01:02:03', status: 'publish', recordPageId: pageId,
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: contract.identity.path.replace(/\/$/u, '')},
    malaysiaCountryMarketContractJson: JSON.stringify(contract),
  })
}

describe('country Market page template', () => {
  it.each([
    ['MARKET-EU-ES', ['hero', 'applications', 'documents', 'quote'], 14],
    ['MARKET-IN-001', ['hero', 'material', 'applications', 'documents', 'quote'], 11],
    ['MARKET-EU-NL', ['hero', 'applications', 'products', 'documents', 'quote'], 12],
    ['MARKET-EU-BE', ['hero', 'product-origin', 'applications', 'documents', 'quote'], 12],
  ] as const)('renders %s exact module order and crawlable action count', (pageId, moduleIds, mainLinkCount) => {
    const {container} = render(<MalaysiaCountryMarketPage marketPage={dto(pageId)} />)
    expect(container.firstElementChild?.getAttribute('data-page-id')).toBe(pageId)
    const main = container.querySelector('main')!
    expect(main.querySelectorAll('h1')).toHaveLength(1)
    expect([...main.querySelectorAll('[data-module]')].map((node) => node.getAttribute('data-module')))
      .toEqual(['breadcrumb', ...moduleIds])
    expect(main.querySelectorAll('a')).toHaveLength(mainLinkCount)
    expect(main.querySelectorAll('form,img,details')).toHaveLength(0)
    expect(container.querySelectorAll('header [aria-current="page"]')).toHaveLength(2)
    for (const current of container.querySelectorAll('header [aria-current="page"]')) {
      expect(current.textContent).toBe('Markets')
    }
    expect(container.textContent).not.toContain('CURRENT')
  })

  it.each([
    ['MARKET-EU-ES', 'Spain'], ['MARKET-IN-001', 'India'],
    ['MARKET-EU-NL', 'Netherlands'], ['MARKET-EU-BE', 'Belgium'],
  ] as const)('keeps %s RFQ contextual and Documents source-only while global RFQ stays clean', (pageId, country) => {
    const {container} = render(<MalaysiaCountryMarketPage marketPage={dto(pageId)} />)
    const main = container.querySelector('main')!
    for (const link of main.querySelectorAll('a[href*="/request-a-quote/"]')) {
      expect(link.getAttribute('href')).toContain(`destination_country=${country}`)
      expect(link.getAttribute('href')).toContain(`source_page_id=${pageId}`)
    }
    const documents = main.querySelector('a[href*="/request-documents/"]')
    expect(documents?.getAttribute('href')).toBe(`/request-documents/?source_page_id=${pageId}&market_id=${pageId}`)
    for (const link of container.querySelectorAll('header a[href*="request-a-quote"],footer a[href*="request-a-quote"]')) {
      expect(link.getAttribute('href')).toBe('/request-a-quote/')
    }
  })

  it('keeps every approved answer in the initial Netherlands DOM and qualifies the external VVVF link', () => {
    const {container} = render(<MalaysiaCountryMarketPage marketPage={dto('MARKET-EU-NL')} />)
    expect(container.textContent).toContain('they do not determine which TiO2 grade to use')
    expect(container.textContent).toContain('A Certificate of Origin is available upon request.')
    expect(container.querySelector('a[href="https://www.vvvf.nl/brancheorganisatie"]')?.getAttribute('rel'))
      .toBe('external noopener noreferrer')
  })

  it('keeps the Spain quote action between preparation and post-submit guidance', () => {
    const {container} = render(<MalaysiaCountryMarketPage marketPage={dto('MARKET-EU-ES')} />)
    const quote = container.querySelector('[data-module="quote"]')!
    const rfq = quote.querySelector('a[href^="/request-a-quote/"]')!
    const postSubmit = [...quote.querySelectorAll('p')]
      .find((paragraph) => paragraph.textContent?.startsWith('After you submit your quotation request'))!
    const related = quote.querySelector('a[href="/markets/european-union/"]')!
    expect(rfq.compareDocumentPosition(postSubmit) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(postSubmit.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
