// @vitest-environment jsdom

import {render} from '@testing-library/react'
import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaResourceOriginPage} from '@/components/sites/tio2-my/resources/malaysia-resource-origin-page'
import {malaysiaResourceOriginDto} from '@/tests/fixtures/tio2-my-resource-origin'

const expectedModules = [
  'GLOBAL_HEADER', 'BREADCRUMB', 'HERO', 'DIRECT_ANSWER',
  'SIX_CHECKS', 'TECHNICAL_COMPARISON', 'APPLICATION_CONTEXT',
  'DOCUMENT_SCOPE', 'DESTINATION_REVIEW', 'QUALIFICATION_DECISION',
  'BUYER_QUESTIONS', 'FINAL_ACTION', 'GLOBAL_FOOTER',
]

describe('RES-ORIGIN page template', () => {
  it('server-renders the approved thirteen-module order and every FAQ answer', () => {
    const page = malaysiaResourceOriginDto()
    const html = renderToStaticMarkup(<MalaysiaResourceOriginPage page={page} />)
    const document = new DOMParser().parseFromString(html, 'text/html')

    expect([...document.querySelectorAll('[data-res-origin-module]')].map((node) => (
      node.getAttribute('data-res-origin-module')
    ))).toEqual(expectedModules)
    expect(document.querySelectorAll('h1')).toHaveLength(1)
    expect(document.querySelector('h1')?.textContent).toBe(page.hero.h1)
    for (const item of page.buyerQuestions.items) expect(document.body.textContent).toContain(item.answer)
  })

  it('uses shared Malaysia chrome with Resources active and production logo roles', () => {
    const page = malaysiaResourceOriginDto()
    const {container} = render(<MalaysiaResourceOriginPage page={page} />)
    const header = container.querySelector('header')!
    const footer = container.querySelector('footer')!

    expect(header.querySelector('a[aria-current="page"]')?.textContent).toBe('Resources')
    expect(header.textContent).not.toMatch(/CURRENT/iu)
    expect(header.querySelector('img')?.getAttribute('src')).toBe(page.globalChrome.logo.primary.src)
    expect(footer.querySelector('img')?.getAttribute('src')).toBe(page.globalChrome.logo.reverse.src)
  })

  it('renders valid three-level breadcrumbs and no disabled affordances', () => {
    const {container} = render(<MalaysiaResourceOriginPage page={malaysiaResourceOriginDto()} />)
    const breadcrumb = container.querySelector('nav[aria-label="Breadcrumb"]')!

    expect([...breadcrumb.querySelectorAll('li')].map((item) => item.textContent)).toEqual([
      'Home', 'Resources', 'Non-China Titanium Dioxide Supply Guide',
    ])
    expect([...breadcrumb.querySelectorAll('a')].map((item) => item.getAttribute('href'))).toEqual(['/', '/resources/'])
    expect(container.querySelectorAll('[disabled], [aria-disabled="true"]')).toHaveLength(0)
  })
})
