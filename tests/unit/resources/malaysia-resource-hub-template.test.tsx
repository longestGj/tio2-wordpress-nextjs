// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaResourceHub} from '@/components/sites/tio2-my/resources/malaysia-resource-hub'
import {projectEligibleMalaysiaResources, toMalaysiaResourceHubDto} from '@/lib/wordpress/resource-hub-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-resource-hub.json'

afterEach(cleanup)

const hub = (resourceRelations: unknown = []) => toMalaysiaResourceHubDto({
  id: 'resource-hub-my-1', modifiedGmt: '2026-09-01T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/resources'},
  malaysiaResourceHubContractJson: JSON.stringify(contract),
  resourceProjection: projectEligibleMalaysiaResources(resourceRelations),
})

const eligible = (pageId: string, displayOrder: number, featuredRank: number | null) => ({
  pageId, siteScope: 'tio2-my', locale: 'en', title: `Research ${pageId}`,
  summary: `Approved summary ${pageId}`, canonicalPath: `/resources/research-${pageId.toLowerCase()}/`,
  canonicalUrl: `https://tio2malaysia.com/resources/research-${pageId.toLowerCase()}/`,
  mappingStatus: 'PUBLIC_ELIGIBLE', childContentStatus: 'APPROVED', claimStatus: 'APPROVED',
  routeStatus: 'VERIFIED_PUBLIC', canonicalStatus: 'VERIFIED', releaseState: 'LIVE_APPROVED',
  featuredRank, displayOrder, kind: 'general',
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
    const {container} = render(<MalaysiaResourceHub resourceHub={hub([
      eligible('C', 3, null), eligible('A', 1, 1), eligible('B', 2, 2), eligible('D', 4, null),
    ])} />)
    const featured = container.querySelector('[data-module="featured-resources"]')!
    const latest = container.querySelector('[data-module="latest-research"]')!
    expect(Array.from(featured.querySelectorAll('article h3'), (node) => node.textContent)).toEqual(['Research A', 'Research B', 'Research C'])
    expect(Array.from(latest.querySelectorAll('article h3'), (node) => node.textContent)).toEqual(['Research D'])
    expect(container.querySelector('a[href="#featured-resources"]')).not.toBeNull()
  })
})
