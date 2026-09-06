// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaDocumentsHub} from '@/components/sites/tio2-my/documents/malaysia-documents-hub'
import {toMalaysiaDocumentsHubDto} from '@/lib/wordpress/documents-hub-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'

afterEach(cleanup)

const dto = () => toMalaysiaDocumentsHubDto({
  id: 'documents-hub-1',
  modifiedGmt: '2026-09-02T01:02:03',
  status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]},
  publishingFields: {publicPath: '/documents'},
  malaysiaDocumentsHubContractJson: JSON.stringify(contract),
})

describe('DOC-000 template and interaction contract', () => {
  it('renders the exact module order, one H1, 14 ordered grades and all six answers in the initial DOM', () => {
    const {container} = render(<MalaysiaDocumentsHub documentsHub={dto()} />)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1, name: contract.hero.h1})).toBeTruthy()
    expect(Array.from(container.querySelectorAll('main [data-module]'), (node) => node.getAttribute('data-module'))).toEqual([
      'breadcrumb', 'hero', 'grade-selector', 'how-it-works', 'review-scenarios',
      'document-categories', 'why-on-request', 'buyer-questions', 'closing-cta',
    ])
    expect(Array.from(screen.getByLabelText('Product Grade').querySelectorAll('option'), (node) => node.textContent)).toEqual([
      'Select a product grade', ...contract.gradeSelector.grades,
    ])
    for (const item of contract.buyerQuestions.items) expect(screen.getAllByText(item.answer).length).toBeGreaterThan(0)
    expect(contract.identity).toMatchObject({
      locale: 'en', pageType: 'navigation_hub', primaryKeyword: 'NO_PRIMARY_KEYWORD', currentNavigationKey: 'Documents',
    })
    expect(contract.howItWorks.items.map(({stableId, order}) => ({stableId, order}))).toEqual([
      {stableId: 'identify-review-need', order: 1},
      {stableId: 'select-product-grade', order: 2},
      {stableId: 'request-documents', order: 3},
    ])
    expect(contract.buyerQuestions.items.map(({order}) => order)).toEqual([1, 2, 3, 4, 5, 6])
    expect(contract.closingCta.selectorTargetId).toBe(contract.gradeSelector.fieldId)
  })

  it('reuses shared Chrome with Documents current and no body RFQ', () => {
    const {container} = render(<MalaysiaDocumentsHub documentsHub={dto()} />)
    const current = container.querySelectorAll('a[aria-current="page"]')
    expect(current).toHaveLength(2)
    for (const link of current) expect(link.textContent).toBe('Documents')
    expect(container.querySelector('main a[href^="/request-a-quote/"]')).toBeNull()
    expect(container.querySelector('header')?.textContent).not.toMatch(/CURRENT/iu)
  })

  it('keeps the direct hero request query-free and generates only an encoded grade query after selection', async () => {
    const user = userEvent.setup()
    const {container} = render(<MalaysiaDocumentsHub documentsHub={dto()} />)
    expect(screen.getByRole('link', {name: 'Start a Document Request'}).getAttribute('href')).toBe('/request-documents/')
    const select = screen.getByLabelText('Product Grade')
    const continueButton = screen.getByRole('button', {name: 'Continue to Request Documents'})
    expect(continueButton.hasAttribute('disabled')).toBe(false)
    await user.click(continueButton)
    expect(screen.getByText('Select a product grade to continue.')).toBeTruthy()
    expect(select.getAttribute('aria-invalid')).toBe('true')
    expect(document.activeElement).toBe(select)
    await user.selectOptions(select, 'M-2196')
    expect(screen.getByText('Selected product grade: M-2196')).toBeTruthy()
    const form = container.querySelector('form[action="/request-documents/"]')
    expect(form).not.toBeNull()
    expect(form?.getAttribute('method')).toBe('get')
    expect(form?.querySelector('select[name="product"]')?.getAttribute('required')).not.toBeNull()
    expect((form?.querySelector('select[name="product"]') as HTMLSelectElement).value).toBe('M-2196')
    expect(form?.querySelectorAll('[name]')).toHaveLength(1)
  })

  it('allows one FAQ open at a time while retaining every answer node', async () => {
    const user = userEvent.setup()
    const {container} = render(<MalaysiaDocumentsHub documentsHub={dto()} />)
    const buttons = screen.getAllByRole('button', {name: contract.buyerQuestions.items[1].question})
    await user.click(buttons[0])
    expect(buttons[0].getAttribute('aria-expanded')).toBe('true')
    const expanded = Array.from(container.querySelectorAll('[data-faq-question][aria-expanded="true"]'))
    expect(expanded).toHaveLength(1)
    expect(container.querySelectorAll('[data-faq-answer]')).toHaveLength(6)
    for (const answer of container.querySelectorAll<HTMLElement>('[data-faq-answer]')) {
      expect(answer.getAttribute('role')).toBe('region')
      expect(answer.getAttribute('aria-labelledby')).toBeTruthy()
    }
  })
})
