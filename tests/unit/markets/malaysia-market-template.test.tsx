// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaMarketHub} from '@/components/sites/tio2-my/markets/malaysia-market-hub'
import {toMalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

afterEach(cleanup)

function marketHub() {
  return toMalaysiaMarketHubDto({
    id: 'market-hub-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets'},
    malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
  })
}

describe('MalaysiaMarketHub', () => {
  it('renders the exact module order, one H1 and all answers in the initial DOM', () => {
    const {container} = render(<MalaysiaMarketHub marketHub={marketHub()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: 'Choose Your Destination Market'})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('[data-module]'), (node) => node.getAttribute('data-module'))).toEqual([
      'breadcrumb', 'hero', 'destination-market', 'how-to-choose',
      'next-procurement-check', 'current-information', 'buyer-questions',
    ])
    for (const item of approvedContract.buyerQuestions) {
      expect(screen.getByText(item.answer)).toBeTruthy()
    }
  })

  it('uses ten crawlable destination anchors and emits no body RFQ', () => {
    const {container} = render(<MalaysiaMarketHub marketHub={marketHub()} />)
    const actions = container.querySelectorAll('a[data-market-action]')
    expect(actions).toHaveLength(10)
    expect(Array.from(actions, (link) => link.getAttribute('href'))).toEqual(
      approvedContract.destinations.items.map(({href}) => href),
    )
    expect(container.querySelector('main a[href="/request-a-quote/"]')).toBeNull()
    expect(container.textContent).not.toMatch(/PT-BR|RES-TRADE|site_scope|release blocker/iu)
  })

  it('keeps Markets current and all Global Chrome RFQ surfaces scope-bound', () => {
    const {container} = render(<MalaysiaMarketHub marketHub={marketHub()} />)
    const current = container.querySelectorAll('a[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const link of current) expect(link.textContent).toBe('Markets')
    expect(container.querySelector('header')?.textContent).not.toMatch(/CURRENT/iu)
    const rfqLinks = container.querySelectorAll('a[href="/request-a-quote/"]')
    expect(rfqLinks.length).toBeGreaterThanOrEqual(3)
    for (const link of rfqLinks) {
      expect(link.getAttribute('data-site-scope')).toBe('tio2-my')
      expect(link.getAttribute('data-source-page')).toBe('MARKET-000')
    }
  })

  it('contains Mobile Menu focus and returns it to Menu on Escape', async () => {
    const user = userEvent.setup()
    const {container} = render(<MalaysiaMarketHub marketHub={marketHub()} />)
    const button = screen.getByRole('button', {name: 'Open primary navigation'})
    await user.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    const menu = container.querySelector<HTMLElement>('#malaysia-mobile-menu')!
    const links = Array.from(menu.querySelectorAll<HTMLAnchorElement>('a'))
    const close = screen.getByRole('button', {name: 'Close primary navigation menu'})
    await waitFor(() => expect(document.activeElement).toBe(close))
    links.at(-1)?.focus()
    fireEvent.keyDown(menu, {key: 'Tab'})
    expect(document.activeElement).toBe(close)
    await user.keyboard('{Escape}')
    expect(button.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement).toBe(button)
  })
})
