// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaResourceHub} from '@/components/sites/tio2-my/resources/malaysia-resource-hub'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {
  resourceFixturePolicies,
  resourceH3Relations,
  resourceH4Relations,
  resourceH5Relations,
} from '@/tests/fixtures/tio2-my-resource-hub-states'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

afterEach(cleanup)

const hub = (resourceRelations: unknown = []) => toMalaysiaResourceHubDto({
  id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
  malaysiaResourceHubContractJson: JSON.stringify(contract),
  resourceProjection: projectEligibleMalaysiaResources(resourceRelations, resourceFixturePolicies),
})

describe('MalaysiaResourceHub H0', () => {
  it('renders exact H0 module order, one H1 and all answers in initial DOM', () => {
    const {container} = render(<MalaysiaResourceHub resourceHub={hub()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: contract.hero.h1})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('[data-module]'), (node) => node.getAttribute('data-module'))).toEqual([
      'breadcrumb', 'hero', 'research-paths', 'evidence-standards', 'buyer-questions',
    ])
    expect(container.querySelector('[data-module="featured-resources"]')).toBeNull()
    expect(container.querySelector('[data-module="latest-research"]')).toBeNull()
    for (const item of contract.buyerQuestions) expect(screen.getByText(item.answer)).toBeTruthy()
  })

  it('reuses shared Chrome with Resources current and no body RFQ', () => {
    const {container} = render(<MalaysiaResourceHub resourceHub={hub()} />)
    const current = container.querySelectorAll('a[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const link of current) expect(link.textContent).toBe('Resources')
    expect(container.querySelector('header')?.textContent).not.toMatch(/CURRENT/iu)
    expect(container.querySelector('main a[href^="/request-a-quote/"]')).toBeNull()
    const scoped = container.querySelectorAll('header a[href="/request-a-quote/"], footer a[href="/request-a-quote/"]')
    expect(scoped.length).toBeGreaterThanOrEqual(3)
    for (const link of scoped) {
      expect(link.getAttribute('data-site-scope')).toBe('tio2-my')
      expect(link.getAttribute('data-source-page')).toBe('RES-000')
    }
  })

  it('renders Featured and Latest atomically from one H3 projection', () => {
    const {container} = render(<MalaysiaResourceHub resourceHub={hub(resourceH3Relations)} />)
    const featured = container.querySelector('[data-module="featured-resources"]')!
    const latest = container.querySelector('[data-module="latest-research"]')!
    expect(Array.from(featured.querySelectorAll('article h3'), (node) => node.textContent)).toEqual(['Non-China Titanium Dioxide Supply Guide'])
    expect(Array.from(latest.querySelectorAll('article h3'), (node) => node.textContent)).toEqual(['Chloride vs Sulfate Titanium Dioxide'])
    expect(container.querySelector('a[href="#featured-resources"]')).not.toBeNull()
  })

  it('serializes approved type labels, CTAs and all buyer-visible Trade atoms', () => {
    const {container} = render(<MalaysiaResourceHub resourceHub={hub(resourceH4Relations)} />)
    expect(screen.getByText('PROCUREMENT GUIDE')).toBeTruthy()
    expect(screen.getByText('TECHNICAL GUIDE')).toBeTruthy()
    expect(screen.getByText('TRADE & MARKET UPDATE')).toBeTruthy()
    expect(screen.getByRole('link', {name: /Read the sourcing guide/u})).toBeTruthy()
    expect(screen.getByRole('link', {name: /Read the technical guide/u})).toBeTruthy()
    expect(screen.getByRole('link', {name: /Read the trade update/u})).toBeTruthy()
    const source = screen.getByRole('link', {name: 'FIXTURE_ONLY_OFFICIAL_SOURCE'})
    expect(source.getAttribute('href')).toBe('https://example.invalid/official-source')
    expect(screen.getByText('FIXTURE_ONLY_STATUS')).toBeTruthy()
    expect(container.textContent).toContain('FIXTURE_ONLY_SCOPE')
    expect(container.textContent).toContain('2026-08-01')
    expect(container.textContent).toContain('2026-09-01')
  })

  it('removes every H5 Trade card, link, date and status atom together', () => {
    const {container} = render(<MalaysiaResourceHub resourceHub={hub(resourceH5Relations)} />)
    expect(container.querySelector('a[href="/resources/eu-titanium-dioxide-anti-dumping-duty/"]')).toBeNull()
    for (const removed of [
      'FIXTURE_ONLY_TRADE_UPDATE', 'FIXTURE_ONLY_OFFICIAL_SOURCE',
      'FIXTURE_ONLY_STATUS', '2026-08-01',
    ]) expect(container.textContent).not.toContain(removed)
    expect(Array.from(
      container.querySelectorAll('[data-module="latest-research"] article h3'),
      (node) => node.textContent,
    )).toEqual(['Chloride vs Sulfate Titanium Dioxide'])
  })
})
