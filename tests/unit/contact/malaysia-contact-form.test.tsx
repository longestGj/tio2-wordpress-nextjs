// @vitest-environment jsdom

import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {MalaysiaContactForm} from '@/components/sites/tio2-my/contact/malaysia-contact-form'
import {toMalaysiaContactPageDto} from '@/lib/wordpress/contact-page-v01-dto'
import {malaysiaContactPageSource} from '@/tests/fixtures/tio2-my-contact-page'

const form = toMalaysiaContactPageDto(malaysiaContactPageSource()).form

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '01234567-89ab-cdef-0123-456789abcdef')
  vi.stubGlobal('fetch', vi.fn(async () => Response.json({success: false}, {status: 400})))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks() })

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
  await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
  await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
  await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
  await user.type(screen.getByLabelText(/Subject/u), 'Partnership')
  await user.type(screen.getByLabelText(/Message/u), 'General business inquiry.')
}

describe('CONTACT-001 form shell', () => {
  it('renders only the six approved controls and exact privacy path', () => {
    const {container} = render(<MalaysiaContactForm form={form} />)
    expect(container.querySelectorAll('input, textarea')).toHaveLength(6)
    expect(container.querySelectorAll('textarea')).toHaveLength(1)
    expect(screen.getByRole('link', {name: 'Privacy Policy'}).getAttribute('href')).toBe('/privacy-policy/')
    expect(container.textContent).not.toMatch(/product grade|quantity|phone|whatsapp|marketing consent/iu)
  })

  it('focuses linked validation summary, retains values and sends no request', async () => {
    const user = userEvent.setup()
    render(<MalaysiaContactForm form={form} />)
    await user.type(screen.getByLabelText(/^Company/u), 'Retained Company')
    await user.click(screen.getByRole('button', {name: 'Send a General Inquiry'}))
    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(summary.textContent).toContain('Review the highlighted fields and correct the items listed below.')
    expect((screen.getByLabelText(/^Company/u) as HTMLInputElement).value).toBe('Retained Company')
    await user.click(within(summary).getByRole('link', {name: /Full Name/u}))
    expect(document.activeElement).toBe(screen.getByLabelText(/Full Name/u))
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves over-limit input instead of truncating it', async () => {
    const user = userEvent.setup()
    render(<MalaysiaContactForm form={form} />)
    const company = screen.getByLabelText(/^Company/u) as HTMLInputElement
    fireEvent.change(company, {target: {value: '界'.repeat(161)}})
    await user.click(screen.getByRole('button', {name: 'Send a General Inquiry'}))
    expect(company.value).toBe('界'.repeat(161))
    expect(screen.getByRole('alert').textContent).toContain('Keep your company name to 160 characters or fewer.')
  })

  it('blocks concurrent activation and shows retained values during pending and failure', async () => {
    let settle!: (response: Response) => void
    vi.mocked(fetch).mockImplementationOnce(() => new Promise((resolve) => { settle = resolve }))
    const user = userEvent.setup()
    render(<MalaysiaContactForm form={form} />)
    await fillValid(user)
    const submit = screen.getByRole('button', {name: 'Send a General Inquiry'})
    await user.dblClick(submit)
    expect(fetch).toHaveBeenCalledOnce()
    expect((screen.getByRole('button', {name: 'Sending your inquiry…'}) as HTMLButtonElement).disabled).toBe(true)
    expect(within(screen.getByRole('region', {name: 'Entered form values'})).getByText('Example Co')).toBeTruthy()
    settle(Response.json({success: true}, {status: 200}))
    expect(await screen.findByRole('heading', {name: 'Your inquiry has been sent'})).toBeTruthy()
    expect(screen.queryByRole('heading', {name: 'Your inquiry was not sent'})).toBeNull()
    expect((screen.getByLabelText(/^Company/u) as HTMLInputElement).value).toBe('Example Co')
  })

  it('manual retry uses the current retained payload, with no automatic retry or success route', async () => {
    const user = userEvent.setup()
    render(<MalaysiaContactForm form={form} />)
    await fillValid(user)
    await user.click(screen.getByRole('button', {name: 'Send a General Inquiry'}))
    await screen.findByRole('heading', {name: 'Your inquiry was not sent'})
    expect(fetch).toHaveBeenCalledOnce()
    await user.type(screen.getByLabelText(/Subject/u), ' Updated')
    await user.click(screen.getByRole('button', {name: 'Try again'}))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
    const secondBody = JSON.parse(String(vi.mocked(fetch).mock.calls[1]?.[1]?.body)) as Record<string, string>
    expect(fetch).toHaveBeenCalledWith('https://api.web3forms.com/submit', expect.objectContaining({method: 'POST'}))
    expect(secondBody.inquiry_subject).toBe('Partnership Updated')
    expect(secondBody.subject).toBe('TiO2 Malaysia general inquiry')
    expect(secondBody).toMatchObject({site_scope: 'tio2-my', page_id: 'CONTACT-001', workflow_type: 'contact'})
    expect(secondBody.access_key).toBe('01234567-89ab-cdef-0123-456789abcdef')
    expect(window.location.pathname).toBe('/')
  })

  it.each([
    [200, 'application/json', {success: false}],
    [202, 'application/json', {success: true}],
  ])('keeps the failure state for an ambiguous provider response %#', async (status, contentType, body) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(body), {status, headers: {'content-type': contentType}}))
    const user = userEvent.setup()
    render(<MalaysiaContactForm form={form} />)
    await fillValid(user)
    await user.click(screen.getByRole('button', {name: 'Send a General Inquiry'}))
    expect(await screen.findByRole('heading', {name: 'Your inquiry was not sent'})).toBeTruthy()
    expect(screen.queryByRole('heading', {name: 'Your inquiry has been sent'})).toBeNull()
    expect(fetch).toHaveBeenCalledOnce()
  })
})
