// @vitest-environment jsdom

import {render} from '@testing-library/react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaResourceProcPage} from '@/components/sites/tio2-my/resources/malaysia-resource-proc-page'
import {malaysiaResourceProcDto} from '@/tests/fixtures/tio2-my-resource-proc'

const expectedModules = [
  'GLOBAL_HEADER', 'BREADCRUMB', 'HERO', 'DIRECT_ANSWER', 'ON_THIS_PAGE',
  'ROUTE_DIFFERENCE', 'LABEL_LIMIT', 'GRADE_EVIDENCE', 'APPLICATION_OVERLAP',
  'QUALIFICATION_WORKFLOW', 'BUYER_QUESTIONS', 'SOURCES', 'FINAL_ACTION',
  'GLOBAL_FOOTER',
]

describe('RES-PROC page template', () => {
  it('server-renders fourteen modules, one H1, five targets and every answer', () => {
    const page = malaysiaResourceProcDto()
    const html = renderToStaticMarkup(<MalaysiaResourceProcPage page={page} />)
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect([...document.querySelectorAll('[data-res-proc-module]')].map((node) => (
      node.getAttribute('data-res-proc-module')
    ))).toEqual(expectedModules)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelector('h1')?.textContent).toBe(page.hero.h1)
    expect(page.onThisPage.items.map(({targetAnchor}) => (
      document.getElementById(targetAnchor)?.id
    ))).toEqual(page.onThisPage.items.map(({targetAnchor}) => targetAnchor))
    for (const item of page.buyerQuestions.items) expect(document.body.textContent).toContain(item.answer)
  })

  it('uses shared chrome with Resources current and exact production logo roles', () => {
    const page = malaysiaResourceProcDto()
    const {container} = render(<MalaysiaResourceProcPage page={page} />)
    const header = container.querySelector('header')!
    const footer = container.querySelector('footer')!

    expect(header.querySelector('a[aria-current="page"]')?.textContent).toBe('Resources')
    expect(header.querySelector('img')?.getAttribute('src')).toBe(page.globalChrome.logo.primary.src)
    expect(footer.querySelector('img')?.getAttribute('src')).toBe(page.globalChrome.logo.reverse.src)
    expect(container.querySelector('[data-site-id="tio2-my"]')).not.toBeNull()
  })

  it('renders the three-level breadcrumb and no disabled or placeholder affordances', () => {
    const {container} = render(<MalaysiaResourceProcPage page={malaysiaResourceProcDto()} />)
    const breadcrumb = container.querySelector('nav[aria-label="Breadcrumb"]')!

    expect([...breadcrumb.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Home', 'Resources', 'Chloride vs Sulfate Titanium Dioxide',
    ])
    expect([...breadcrumb.querySelectorAll('a')].map((item) => item.getAttribute('href'))).toEqual(['/', '/resources/'])
    expect(container.querySelectorAll('[disabled], [aria-disabled="true"]')).toHaveLength(0)
    expect(container.textContent).not.toMatch(/coming soon|placeholder/iu)
  })

  it('renders six grade records with explicit question, evidence and interpretation semantics', () => {
    const {container} = render(<MalaysiaResourceProcPage page={malaysiaResourceProcDto()} />)
    const rows = container.querySelectorAll('[data-grade-evidence-record]')
    expect(rows).toHaveLength(6)
    for (const row of rows) {
      expect(row.querySelector('[data-grade-question]')?.textContent).toBeTruthy()
      expect(row.querySelector('[data-grade-evidence]')?.textContent).toBeTruthy()
      expect(row.querySelector('[data-grade-interpretation]')?.textContent).toBeTruthy()
    }
    expect(container.querySelectorAll('[data-route-key]')).toHaveLength(2)
    expect([...container.querySelectorAll('[data-route-key]')].map((item) => item.textContent)).toEqual([
      expect.stringContaining('Chloride route'), expect.stringContaining('Sulfate route'),
    ])
  })
})
