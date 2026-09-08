// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {MalaysiaNotFoundPage} from '@/components/sites/tio2-my/system/malaysia-not-found-page'

afterEach(cleanup)

describe('SYS-404 recovery page', () => {
  it('renders the exact recovery copy and five clean targets through shared Chrome', () => {
    const {container} = render(<MalaysiaNotFoundPage />)
    expect(screen.getByText('404 · PAGE NOT FOUND')).toBeTruthy()
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Let’s help you find what you need.')
    expect(within(container.querySelector('[data-system-404-panel]')!).getAllByRole('link').map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
      ['Explore Products', '/products/'],
      ['Go to Homepage', '/'],
      ['Request Documents', '/request-documents/'],
      ['Contact Our Team', '/contact/'],
      ['Request a Quote', '/request-a-quote/'],
    ])
    expect(within(container.querySelector('header')!).queryAllByRole('link', {current: 'page'})).toHaveLength(0)
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.querySelector('form')).toBeNull()
    expect(container.querySelector('script[type="application/ld+json"]')).toBeNull()
  })
})

