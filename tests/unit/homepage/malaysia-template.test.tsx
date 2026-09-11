// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaHomepage} from '@/components/sites/tio2-my/homepage/malaysia-homepage'
import {ResponsiveProductGroup} from '@/components/sites/tio2-my/homepage/responsive-product-groups'
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
  it('keeps Home current without rendering a visible CURRENT label', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const header = container.querySelector('header')!
    const desktopCurrent = header.querySelector('nav[aria-label="Primary navigation"] a[aria-current="page"]')
    const mobileCurrent = header.querySelector('nav[aria-label="Mobile navigation"] a[aria-current="page"]')

    expect(desktopCurrent?.textContent).toBe('Home')
    expect(mobileCurrent?.textContent).toBe('Home')
    expect(header.textContent).not.toMatch(/CURRENT/iu)
  })

  it('renders the approved module order, single H1, and full product inventory', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: approvedContract.seo.h1})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('section[data-module]'), (section) => section.getAttribute('data-module'))).toEqual([
      'hero', 'start-here', 'markets', 'products', 'applications', 'company',
      'documents', 'resources', 'page-rfq',
    ])
    const approvedGradeIds = approvedContract.products.groups.flatMap((group) => group.gradeIds)
    for (const id of approvedGradeIds) {
      expect(screen.getByText(id)).toBeTruthy()
    }
    expect(Array.from(container.querySelectorAll('[data-product-grade-id]'), (node) => node.textContent))
      .toEqual(approvedGradeIds)
    expect(approvedContract.products.groups.map((group) => group.gradeIds.length)).toEqual([6, 5, 2, 1])
  })

  it('keeps the exact approved Home body href inventory in module order', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const expected = [
      approvedContract.hero.primaryCta.href,
      approvedContract.hero.secondaryCta.href,
      ...approvedContract.startHere.items.map((item) => item.href),
      approvedContract.markets.sectionCta.href,
      ...approvedContract.markets.items.map((item) => item.href),
      ...approvedContract.products.processLinks.map((item) => item.href),
      approvedContract.products.primaryCta.href,
      ...approvedContract.applications.items.flatMap((item) => item.href ? [item.href] : []),
      approvedContract.company.cta.href,
      ...approvedContract.documents.items.map((item) => item.href),
      ...approvedContract.resources.topics.flatMap((item) => item.href ? [item.href] : []),
      ...approvedContract.resources.answers.map((item) => item.cta.href),
      approvedContract.pageRfq.cta.href,
    ]

    expect(Array.from(container.querySelectorAll('main a[href]'), (link) => link.getAttribute('href')))
      .toEqual(expected)
  })

  it('renders four independently expandable product groups with approved counts', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const groups = [...container.querySelectorAll<HTMLElement>('[data-product-group]')]
    expect(groups).toHaveLength(4)
    expect(groups.map((group) => group.getAttribute('data-mobile-open'))).toEqual(['false', 'false', 'false', 'false'])
    expect(groups.map((group) => group.querySelector('[data-product-disclosure]')?.textContent)).toEqual(
      approvedContract.products.groups.map(
        (group) => `${group.title}${group.gradeIds.length} · Expand grades +`,
      ),
    )
    const gradeIds = [...container.querySelectorAll('[data-product-grade-id]')]
      .map((node) => node.textContent)
    expect(gradeIds).toHaveLength(14)
    expect(new Set(gradeIds).size).toBe(14)
  })

  it('server-renders mobile product groups collapsed before hydration', () => {
    const markup = renderToStaticMarkup(
      <ResponsiveProductGroup count={4} title="General-purpose Rutile">
        <article>Grade inventory</article>
      </ResponsiveProductGroup>,
    )

    expect(markup).toContain('data-mobile-open="false"')
    expect(markup).toContain('aria-expanded="false"')
    expect(markup).toContain('General-purpose Rutile, 4 grades, expand grades')
  })

  it('renders the six approved prerelease Home actions as native links', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const approvedActions = [
      ['Coatings information →', '/applications/titanium-dioxide-for-coatings/'],
      ['Plastics information →', '/applications/titanium-dioxide-for-plastics/'],
      ['Masterbatch information →', '/applications/titanium-dioxide-for-masterbatch/'],
      ['Printing inks information →', '/applications/titanium-dioxide-for-printing-inks/'],
      ['Paper information →', '/applications/titanium-dioxide-for-paper/'],
      ['Read process overview →', '/resources/chloride-vs-sulfate-titanium-dioxide/'],
    ] as const

    for (const [label, href] of approvedActions) {
      const link = screen.getByRole('link', {name: label})
      expect(link.getAttribute('href')).toBe(href)
      expect(link.getAttribute('aria-disabled')).not.toBe('true')
      expect(screen.queryByText(label, {selector: '[role="link"]'})).toBeNull()
    }
    expect(container.querySelectorAll('[aria-disabled="true"]')).toHaveLength(0)
  })

  it('keeps shared Chrome attribution private while retaining page-owned RFQ context', () => {
    const {container} = render(<MalaysiaHomepage homepage={homepage()} />)
    const rfqLinks = container.querySelectorAll('a[href="/request-a-quote/"]')
    expect(rfqLinks.length).toBeGreaterThanOrEqual(4)
    for (const link of rfqLinks) {
      if (link.closest('header, footer')) {
        expect(link.getAttribute('data-site-scope')).toBeNull()
        expect(link.getAttribute('data-source-page')).toBeNull()
      } else {
        expect(link.getAttribute('data-site-scope')).toBe('tio2-my')
        expect(link.getAttribute('data-source-page')).toBe('HOME-001')
      }
    }
    expect(container.querySelector('[data-module="page-rfq"]')?.getAttribute('data-mobile-render')).toBe('false')
  })
})
