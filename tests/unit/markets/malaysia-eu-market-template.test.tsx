// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaEuMarketPage} from '@/components/sites/tio2-my/markets/malaysia-eu-market-page'
import {toMalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

afterEach(cleanup)

function marketPage() {
  return toMalaysiaEuMarketPageDto({
    id: 'market-eu-001-my-1',
    modifiedGmt: '2026-09-04T01:02:03',
    status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/european-union'},
    malaysiaEuMarketContractJson: JSON.stringify(approvedContract),
  })
}

describe('MalaysiaEuMarketPage', () => {
  it('renders the approved module order, one H1 and every FAQ answer in initial HTML', () => {
    const {container} = render(<MalaysiaEuMarketPage marketPage={marketPage()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: approvedContract.hero.h1})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('[data-module]'), (node) => node.getAttribute('data-module'))).toEqual(
      approvedContract.moduleOrder,
    )
    for (const item of approvedContract.buyerQuestions) {
      expect(screen.getByText(item.answer)).toBeTruthy()
    }
  })

  it('renders only available internal actions as crawlable anchors', () => {
    const {container} = render(<MalaysiaEuMarketPage marketPage={marketPage()} />)
    const main = container.querySelector('main')!
    for (const group of approvedContract.grades.groups) {
      for (const item of group.items) {
        expect(main.querySelector(`a[href="${item.href}"]`)).toBeTruthy()
      }
    }
    for (const item of approvedContract.applications.items) {
      expect(main.querySelector(`a[href="${item.href}"]`)).toBeNull()
      expect(screen.getAllByText(item.title).length).toBeGreaterThan(0)
    }
    for (const item of approvedContract.destinations.items) {
      expect(main.querySelector(`a[href="${item.href}"]`)).toBeNull()
      expect(screen.getByText(item.label)).toBeTruthy()
    }
    expect(main.querySelector(`a[href="${approvedContract.relations.tradeUpdate.href}"]`)).toBeNull()
    expect(screen.queryByText(approvedContract.trade.datedContext)).toBeNull()
    expect(screen.getByText(approvedContract.trade.evergreenAnswer)).toBeTruthy()
    expect(container.textContent).not.toMatch(/routeState|planned|release blocker|site_scope/iu)
  })

  it('uses exact conversion URLs while keeping shared Chrome RFQ unmodified', () => {
    const {container} = render(<MalaysiaEuMarketPage marketPage={marketPage()} />)
    const main = container.querySelector('main')!
    for (const relation of [
      approvedContract.relations.rfq,
      approvedContract.relations.requestDocuments,
      approvedContract.relations.sample,
    ]) {
      expect(main.querySelector(`a[href="${relation.href}"]`)).toBeTruthy()
    }
    const chromeRfq = container.querySelectorAll('header a[href="/request-a-quote/"], footer a[href="/request-a-quote/"]')
    expect(chromeRfq.length).toBeGreaterThanOrEqual(3)
    for (const link of chromeRfq) {
      expect(link.getAttribute('data-site-scope')).toBe('tio2-my')
      expect(link.getAttribute('data-source-page')).toBe('MARKET-EU-001')
    }
    const current = container.querySelectorAll('a[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const link of current) expect(link.textContent).toBe('Markets')
    expect(container.querySelector('header')?.textContent).not.toMatch(/CURRENT/iu)
  })

  it('renders both approved origin actions and keeps the dated trade block atomic', () => {
    const {container} = render(<MalaysiaEuMarketPage marketPage={marketPage()} />)
    const origin = container.querySelector('[data-module="origin"]')!
    expect(origin.querySelector(`a[href="${approvedContract.relations.about.href}"]`)?.textContent)
      .toBe(approvedContract.relations.about.label)
    expect(origin.querySelector(`a[href="${approvedContract.relations.requestDocuments.href}"]`)?.textContent)
      .toBe('Request Origin & Supplier Information')
    expect(container.querySelector('[data-trade-current]')).toBeNull()
  })

  it('keeps all three approved official references inside the conditional trade block', () => {
    const page = structuredClone(marketPage())
    ;(page.relations.tradeUpdate as {routeState: string}).routeState = 'available'
    const {container} = render(<MalaysiaEuMarketPage marketPage={page} />)
    const block = container.querySelector('[data-trade-current]')!
    expect(block).toBeTruthy()
    expect(screen.getByRole('heading', {level: 4, name: 'Official references'})).toBeTruthy()
    for (const reference of approvedContract.trade.references) {
      expect(block.querySelector(`a[href="${reference.url}"]`)?.textContent).toBe(reference.label)
      expect(block.textContent).not.toContain(`(${reference.sourceDate})`)
    }
  })

  it('turns approved Application and destination relations into crawlable anchors only when available', () => {
    const page = structuredClone(marketPage())
    ;(page.relations.applicationHub as {routeState: string}).routeState = 'available'
    for (const item of [...page.applications.items, ...page.destinations.items]) {
      ;(item as {routeState: string}).routeState = 'available'
    }
    const {container} = render(<MalaysiaEuMarketPage marketPage={page} />)
    const main = container.querySelector('main')!
    expect(main.querySelector(`a[href="${approvedContract.relations.applicationHub.href}"]`)?.textContent)
      .toBe(approvedContract.relations.applicationHub.label)
    for (const item of approvedContract.applications.items) {
      expect(main.querySelector(`a[href="${item.href}"]`)?.textContent).toContain(item.actionLabel)
    }
    for (const item of approvedContract.destinations.items) {
      expect(main.querySelector(`a[href="${item.href}"]`)?.textContent).toBe(item.label)
    }
  })
})
