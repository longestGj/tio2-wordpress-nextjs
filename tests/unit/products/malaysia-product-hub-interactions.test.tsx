// @vitest-environment jsdom

import {cleanup, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it} from 'vitest'

import {ProductFaq} from '@/components/sites/tio2-my/products/product-faq'
import {ProductSelector} from '@/components/sites/tio2-my/products/product-selector'
import {toMalaysiaProductHubDto} from '@/lib/wordpress/product-hub-v01-dto'
import {malaysiaProductHubSource} from '@/tests/fixtures/tio2-my-product-hub'

const hub = toMalaysiaProductHubDto(malaysiaProductHubSource())
const grades = hub.directory.groups.flatMap((group) => group.grades)

afterEach(cleanup)

describe('PRODUCT-000 interactions', () => {
  it('updates selector counts in place and exposes the exact Not Sure state', async () => {
    const user = userEvent.setup()
    render(<ProductSelector selector={hub.selector} grades={grades} routeReadiness={hub.routeReadiness} />)

    expect(screen.getByRole('heading', {name: 'Grades to Review — 8'})).toBeTruthy()
    const masterbatch = screen.getByRole('button', {name: 'Masterbatch'})
    await user.click(masterbatch)
    expect(document.activeElement).toBe(masterbatch)
    expect(masterbatch.getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('heading', {name: 'Grades to Review — 7'})).toBeTruthy()

    const notSure = screen.getByRole('button', {name: 'Not Sure'})
    await user.click(notSure)
    expect(document.activeElement).toBe(notSure)
    expect(screen.getByRole('heading', {name: 'Grades to Review — 0'})).toBeTruthy()
    expect(screen.getByText(hub.selector.noResult)).toBeTruthy()
  })

  it('enhances five server-readable answers into a keyboard-operable single-open accordion', async () => {
    const user = userEvent.setup()
    render(<ProductFaq questions={hub.buyerQuestions} />)

    const controls = screen.getAllByRole('button')
    expect(controls).toHaveLength(5)
    expect(controls[0].getAttribute('aria-expanded')).toBe('true')
    expect(controls[1].getAttribute('aria-expanded')).toBe('false')

    await user.click(controls[1])
    expect(controls[0].getAttribute('aria-expanded')).toBe('false')
    expect(controls[1].getAttribute('aria-expanded')).toBe('true')
    expect(screen.getByText(hub.buyerQuestions[1].answer).closest('[hidden]')).toBeNull()
  })
})
