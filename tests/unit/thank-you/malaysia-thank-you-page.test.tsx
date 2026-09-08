// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'

import {MalaysiaThankYouPage} from '@/components/sites/tio2-my/thank-you/malaysia-thank-you-page'
import {recordMalaysiaThankYouReceipt} from '@/lib/thank-you/malaysia-thank-you-session'

beforeEach(() => { sessionStorage.clear(); window.history.replaceState({}, '', '/') })
afterEach(() => { cleanup(); sessionStorage.clear() })

describe('CONV-THANK approved result panels', () => {
  it.each([
    ['direct', 'How can we help?', ['Request a Quote', 'Request Documents', 'Request a Sample']],
    ['quote', 'Thank you. We’ve received your quotation request.', ['Explore Products', 'Go to Homepage']],
    ['documents', 'Thank you. We’ve received your document request.', ['Return to Documents', 'Explore Products']],
    ['sample', 'Thank you. We’ve received your sample request.', ['Explore Products', 'View Applications']],
  ] as const)('renders exactly one %s panel with exact actions', (state, heading, labels) => {
    const {container} = render(<MalaysiaThankYouPage initialState={state} />)
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe(heading)
    expect(container.querySelectorAll('[data-thank-you-panel]')).toHaveLength(1)
    expect(within(container.querySelector('[data-thank-you-panel]')!).getAllByRole('link').map((link) => link.textContent)).toEqual(labels)
    expect(within(container.querySelector('header')!).queryAllByRole('link', {current: 'page'})).toHaveLength(0)
  })

  it('keeps Direct free of every receipt cue', () => {
    const {container} = render(<MalaysiaThankYouPage initialState="direct" />)
    expect(container.textContent).not.toContain('REQUEST RECEIVED')
    expect(container.querySelector('[data-receipt-icon]')).toBeNull()
    expect(container.textContent).not.toContain('Thank you')
  })

  it('resolves a matching same-tab receipt before exposing the success panel', () => {
    recordMalaysiaThankYouReceipt('documents', {storage: sessionStorage})
    window.history.replaceState({}, '', '/thank-you/?request=documents')
    const {container} = render(<MalaysiaThankYouPage />)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Thank you. We’ve received your document request.')
    expect(container.querySelectorAll('[data-thank-you-panel]')).toHaveLength(1)
    expect(container.textContent).not.toContain('How can we help?')
  })

  it('renders Direct for a query-only request without a transient success panel', () => {
    window.history.replaceState({}, '', '/thank-you/?request=quote')
    const {container} = render(<MalaysiaThankYouPage />)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('How can we help?')
    expect(container.textContent).not.toContain('REQUEST RECEIVED')
    expect(container.textContent).not.toContain('quotation request')
  })

  it('renders copyright before the four legal utilities and no Terms link', () => {
    const {container} = render(<MalaysiaThankYouPage initialState="direct" />)
    const footer = container.querySelector('footer')!
    const copyright = footer.querySelector(':scope > p')!
    const legal = within(footer).getByRole('navigation', {name: 'Legal and privacy navigation'})
    expect(copyright.compareDocumentPosition(legal) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(legal.querySelectorAll('a,button')).toHaveLength(4)
    expect(footer.textContent).not.toContain('Terms')
  })
})
