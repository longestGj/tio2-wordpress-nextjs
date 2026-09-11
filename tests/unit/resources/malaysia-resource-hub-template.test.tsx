// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaResourceHub} from '@/components/sites/tio2-my/resources/malaysia-resource-hub'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import {
  resourceFixturePolicies,
  resourceH3Relations,
  resourceH2UnrankedRelations,
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
      'breadcrumb', 'hero', 'browse-resources', 'evidence-standards', 'buyer-questions',
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
      expect(link.getAttribute('data-site-scope')).toBeNull()
      expect(link.getAttribute('data-source-page')).toBeNull()
    }
  })

  it.each([[resourceH3Relations], [resourceH2UnrankedRelations]])('renders each eligible card once under its group', relations => {
    const dto=hub(relations)
    const {container}=render(<MalaysiaResourceHub resourceHub={dto} />)
    expect([...container.querySelectorAll('[data-resource-group] article h4')].map(node=>node.textContent?.replace(/ →$/u,''))).toEqual(dto.resourceGroups.flatMap(group=>group.items.map(item=>item.title)))
    expect(container.querySelectorAll('a[href="#research-paths"]')).toHaveLength(1)
    expect(container.querySelectorAll('#research-paths')).toHaveLength(1)
    expect(container.querySelector('a[href="#browse-resources"], #browse-resources')).toBeNull()
    expect(container.querySelector('[data-module="featured-resources"]')).toBeNull()
    expect(container.querySelector('[data-module="latest-research"]')).toBeNull()
  })

  it('renders the complete approved Trade tuple and omits absent guide metadata', () => {
    const {container}=render(<MalaysiaResourceHub resourceHub={hub(resourceH4Relations)} />)
    const trade=contract.resourceRelations.find(item=>item.pageId==='RES-TRADE-EU')!
    for (const field of ['officialSourceName','applicableScope','sourceDate','reviewDate','publicStatusLabel'] as const) expect(container.textContent).toContain(trade[field])
    const guides=container.querySelectorAll('[data-resource-group="sourcing"] time, [data-resource-group="technical-evaluation"] time')
    expect(guides).toHaveLength(0)
  })
  it('removes revoked Trade card, link, date and status together', () => {
    const {container}=render(<MalaysiaResourceHub resourceHub={hub(resourceH5Relations)} />)
    const trade=contract.resourceRelations.find(item=>item.pageId==='RES-TRADE-EU')!
    expect(container.querySelector(`a[href="${trade.canonicalPath}"]`)).toBeNull()
    expect(container.textContent).not.toContain(trade.officialSourceName)
    expect([...container.querySelectorAll('[data-resource-group] article h4')].map(node=>node.textContent?.replace(/ →$/u,''))).toEqual(resourceH3Relations.map(item=>item.title))
  })
})
