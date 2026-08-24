// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {HomepageRfqDto} from '@/lib/wordpress/homepage-types'
import {makeHomepageNode} from '@/tests/mocks/handlers'

function rfqFixture(): HomepageRfqDto {
  return toHomepageDto(makeHomepageNode(), 'tio2-a', {
    linkPolicy: getHomepageLinkPolicy('tio2-a'),
  }).rfq
}

async function renderForm() {
  const {RfqForm} = await import('@/components/homepage/rfq-form')
  const rfq = rfqFixture()
  const user = userEvent.setup()
  const {container} = render(<RfqForm rfq={rfq} />)
  await waitFor(() =>
    expect(
      (container.querySelector('fieldset') as HTMLFieldSetElement).disabled,
    ).toBe(false),
  )
  return {container, rfq, user}
}

async function completeRequiredFields(
  user: ReturnType<typeof userEvent.setup>,
  rfq: HomepageRfqDto,
) {
  await user.type(screen.getByLabelText(rfq.labels.name), 'Taylor Buyer')
  await user.type(screen.getByLabelText(rfq.labels.company), 'Mineral Works')
  await user.type(screen.getByLabelText(rfq.labels.countryRegion), 'Canada')
  await user.type(screen.getByLabelText(rfq.labels.workEmail), 'buyer@example.com')
  await user.selectOptions(
    screen.getByLabelText(rfq.labels.buyerType),
    'industrial',
  )
  await user.type(screen.getByLabelText(rfq.labels.interest), 'Rutile grades')
  await user.type(
    screen.getByLabelText(rfq.labels.message),
    'Please review a grade for exterior coatings.',
  )
  await user.click(screen.getByLabelText(rfq.labels.privacy))
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('RfqForm', () => {
  it('server-renders every form control disabled before hydration', async () => {
    const {RfqForm} = await import('@/components/homepage/rfq-form')
    const host = document.createElement('div')
    host.innerHTML = renderToStaticMarkup(<RfqForm rfq={rfqFixture()} />)

    const fieldset = host.querySelector('fieldset')
    expect(fieldset).not.toBeNull()
    expect((fieldset as HTMLFieldSetElement).disabled).toBe(true)

    const controls = host.querySelectorAll('input, select, textarea, button')
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      expect(control.matches(':disabled')).toBe(true)
    }
  })

  it('enables every form control after hydration', async () => {
    const {container} = await renderForm()
    const fieldset = container.querySelector('fieldset')

    expect(fieldset).not.toBeNull()
    await waitFor(() =>
      expect((fieldset as HTMLFieldSetElement).disabled).toBe(false),
    )
    for (const control of container.querySelectorAll(
      'input, select, textarea, button',
    )) {
      expect(control.matches(':disabled')).toBe(false)
    }
  })

  it('renders WordPress-managed labels, stable buyer values, and appropriate autocomplete', async () => {
    const {rfq} = await renderForm()

    expect(screen.getByLabelText(rfq.labels.name)).toHaveProperty(
      'autocomplete',
      'name',
    )
    expect(screen.getByLabelText(rfq.labels.company)).toHaveProperty(
      'autocomplete',
      'organization',
    )
    expect(screen.getByLabelText(rfq.labels.countryRegion)).toHaveProperty(
      'autocomplete',
      'country-name',
    )
    expect(screen.getByLabelText(rfq.labels.workEmail)).toMatchObject({
      type: 'email',
      autocomplete: 'email',
    })
    expect(
      (screen.getByRole('option', {
        name: rfq.labels.buyerIndustrial,
      }) as HTMLOptionElement).value,
    ).toBe('industrial')
    expect(
      (screen.getByRole('option', {
        name: rfq.labels.buyerDistributor,
      }) as HTMLOptionElement).value,
    ).toBe('distributor')
    expect(
      (screen.getByRole('option', {
        name: rfq.labels.buyerOther,
      }) as HTMLOptionElement).value,
    ).toBe('other')
    expect(
      (screen.getByLabelText(rfq.labels.privacy) as HTMLInputElement).checked,
    ).toBe(false)
    expect(screen.getByText(rfq.privacyText)).toBeTruthy()
  })

  it.each([
    ['name', 80],
    ['company', 120],
    ['countryRegion', 80],
    ['workEmail', 254],
    ['interest', 160],
    ['expectedQuantity', 80],
    ['destination', 120],
    ['message', 1200],
  ] as const)('enforces the exact %s maximum length of %i', async (field, limit) => {
    const {rfq} = await renderForm()
    const control = screen.getByLabelText(rfq.labels[field])

    expect(control).toHaveProperty('maxLength', limit)
  })

  it('reports required fields, retains entered values, and focuses the first invalid control', async () => {
    const {rfq, user} = await renderForm()
    const company = screen.getByLabelText(rfq.labels.company)
    await user.type(company, 'Retained Company')

    await user.click(screen.getByRole('button', {name: rfq.submitLabel}))

    expect(screen.getByRole('alert').getAttribute('tabindex')).toBe('-1')
    expect(document.activeElement).toBe(screen.getByLabelText(rfq.labels.name))
    expect((company as HTMLInputElement).value).toBe('Retained Company')
    expect(screen.getAllByText(`${rfq.labels.name} is required.`)).toHaveLength(2)
    expect(
      screen.getAllByText(`${rfq.labels.privacy} is required.`),
    ).toHaveLength(2)
  })

  it('rejects invalid email and programmatic over-limit values', async () => {
    const {rfq, user} = await renderForm()
    const name = screen.getByLabelText(rfq.labels.name)
    const email = screen.getByLabelText(rfq.labels.workEmail)
    fireEvent.change(name, {target: {value: 'N'.repeat(81)}})
    fireEvent.change(email, {target: {value: 'not-an-email'}})

    await user.click(screen.getByRole('button', {name: rfq.submitLabel}))

    expect(
      screen.getAllByText(
        `${rfq.labels.name} must be 80 characters or fewer.`,
      ),
    ).toHaveLength(2)
    expect(
      screen.getAllByText(
        `${rfq.labels.workEmail} must be a valid email address.`,
      ),
    ).toHaveLength(2)
  })

  it('accepts optional quantity and destination, submits by keyboard, clears local state, and announces no transmission', async () => {
    const {rfq, user} = await renderForm()
    await user.click(screen.getByRole('button', {name: rfq.submitLabel}))
    expect(screen.getByRole('alert')).toBeTruthy()

    await completeRequiredFields(user, rfq)
    const submit = screen.getByRole('button', {name: rfq.submitLabel})
    submit.focus()
    await user.keyboard('{Enter}')

    const status = screen.getByRole('status')
    expect(status.textContent).toContain(rfq.success.heading)
    expect(status.textContent).toContain(rfq.success.message)
    expect(screen.queryByRole('alert')).toBeNull()
    expect(
      (screen.getByLabelText(rfq.labels.name) as HTMLInputElement).value,
    ).toBe('')
    expect(
      (screen.getByLabelText(rfq.labels.expectedQuantity) as HTMLInputElement)
        .value,
    ).toBe('')
    expect(
      (screen.getByLabelText(rfq.labels.destination) as HTMLInputElement).value,
    ).toBe('')
    expect(
      (screen.getByLabelText(rfq.labels.privacy) as HTMLInputElement).checked,
    ).toBe(false)
  })
})
