// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {MalaysiaRfqPage} from '@/components/sites/tio2-my/request-a-quote/malaysia-rfq-page'
import {toMalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-dto'
import {malaysiaRfqPageSource} from '@/tests/fixtures/tio2-my-rfq-page'

const receiverMocks = vi.hoisted(() => ({submit: vi.fn()}))
vi.mock('@/lib/rfq/malaysia-rfq-receiver', async (original) => ({
  ...await original<typeof import('@/lib/rfq/malaysia-rfq-receiver')>(),
  submitMalaysiaRfq: receiverMocks.submit,
}))

const dto = toMalaysiaRfqPageDto(malaysiaRfqPageSource())

function renderPage() {
  return render(
    <MalaysiaRfqPage
      page={dto}
      prefill={{values: {}, sourcePageId: null}}
      receiverAccessKey="test-key"
      privacyPolicyHref="/legal/privacy-policy/"
      structuredData={<script type="application/ld+json">{'{"@graph":[]}'}</script>}
    />,
  )
}

beforeEach(() => {
  receiverMocks.submit.mockReset()
  receiverMocks.submit.mockResolvedValue({kind: 'receipt_confirmed'})
})
afterEach(() => { cleanup(); vi.clearAllMocks() })

describe('CONV-RFQ template and form', () => {
  it('renders the exact Buyer Clean structure with one shared Chrome and permanent task links', () => {
    const {container} = renderPage()
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Request a Titanium Dioxide Quote')
    expect(container.querySelectorAll('[data-module]')).toHaveLength(4)
    expect(screen.getByRole('form')).toBeTruthy()
    expect(screen.getByRole('link', {name: 'Privacy Policy'}).getAttribute('href')).toBe('/legal/privacy-policy/')
    expect(screen.getByRole('link', {name: /Request a Sample/u}).getAttribute('href')).toBe('/request-sample/')
    expect(screen.getByRole('link', {name: /Request Documents/u}).getAttribute('href')).toBe('/request-documents/')
    expect(container.textContent).not.toContain('Contact')
    expect(container.textContent).not.toContain('CURRENT')
    expect(within(container.querySelector('header')!).queryAllByRole('link', {current: 'page'})).toHaveLength(0)
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('footer')).toHaveLength(1)
  })

  it('focuses the exact error summary, preserves values and links errors to fields', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/Company Name/u), 'Example Industries')
    await user.click(screen.getByRole('button', {name: 'REQUEST QUOTE'}))
    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(summary.textContent).toContain('Please review the highlighted fields.')
    expect((screen.getByLabelText(/Company Name/u) as HTMLInputElement).value).toBe('Example Industries')
    const grade = screen.getByLabelText(/Product \/ Grade/u)
    expect(grade.getAttribute('aria-invalid')).toBe('true')
    await user.click(within(summary).getByRole('link', {name: /Product \/ Grade/u}))
    expect(document.activeElement).toBe(grade)
    expect(receiverMocks.submit).not.toHaveBeenCalled()
  })

  it('shows receipt success only after the receiver explicitly confirms it', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText(/Product \/ Grade/u), 'M-350')
    await user.selectOptions(screen.getByLabelText(/^Application/u), 'Coatings')
    await user.type(screen.getByLabelText(/Required Quantity/u), '20')
    await user.type(screen.getByLabelText(/Destination Country/u), 'Malaysia')
    await user.type(screen.getByLabelText(/Company Name/u), 'Example Industries')
    await user.type(screen.getByLabelText(/Your Name/u), 'A Buyer')
    await user.type(screen.getByLabelText(/Business Email/u), 'buyer@example.com')
    await user.click(screen.getByRole('button', {name: 'REQUEST QUOTE'}))
    expect((await screen.findByRole('status')).textContent).toContain('Thank you. We’ve received your quotation request.')
    expect(receiverMocks.submit).toHaveBeenCalledOnce()
  })

  it('renders the approved unavailable state without a fake receiver or Contact fallback', () => {
    const {container} = render(
      <MalaysiaRfqPage
        page={dto}
        prefill={{values: {}, sourcePageId: null}}
        receiverAccessKey={null}
        privacyPolicyHref={null}
        structuredData={null}
      />,
    )
    expect(screen.getByRole('status').textContent).toContain('The quotation request form is temporarily unavailable.')
    expect(container.textContent).not.toContain('Contact')
  })
})
