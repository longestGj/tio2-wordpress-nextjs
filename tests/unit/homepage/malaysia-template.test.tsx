// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaHomepage} from '@/components/sites/tio2-my/homepage/malaysia-homepage'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

afterEach(cleanup)

function homepage() {
  return toMalaysiaHomepageDto({
    id: 'homepage-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
    malaysiaHomepageContractJson: JSON.stringify(approvedContract),
  })
}

describe('MalaysiaHomepage', () => {
  it('renders the approved module order, single H1, and full product inventory', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: approvedContract.seo.h1})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('section[data-module]'), (section) => section.getAttribute('data-module'))).toEqual([
      'hero', 'start-here', 'markets', 'products', 'applications', 'company',
      'documents', 'resources', 'page-rfq',
    ])
    for (const id of approvedContract.products.groups.flatMap((group) => group.gradeIds)) {
      expect(screen.getByText(id)).toBeTruthy()
    }
  })

  it('never fabricates provisional or candidate hrefs', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    for (const item of approvedContract.applications.items) {
      expect(screen.getByText(item.ctaLabel).closest('a')).toBeNull()
    }
    expect(screen.getByText(approvedContract.resources.topics[1]!.ctaLabel).closest('a')).toBeNull()
    expect(container.querySelector('a[href*="chloride-vs-sulfate"]')).toBeNull()
  })

  it('marks every RFQ action with the Malaysia scope and HOME-001 source', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const rfqLinks = container.querySelectorAll('a[href="/request-a-quote/"]')
    expect(rfqLinks.length).toBeGreaterThanOrEqual(4)
    for (const link of rfqLinks) {
      expect(link.getAttribute('data-site-scope')).toBe('tio2-my')
      expect(link.getAttribute('data-source-page')).toBe('HOME-001')
    }
    expect(container.querySelector('[data-module="page-rfq"]')?.getAttribute('data-mobile-render')).toBe('false')
  })
})
