// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {MalaysiaRequestDocumentsPage} from '@/components/sites/tio2-my/request-documents/malaysia-request-documents-page'
import {createSecureRequestToken} from '@/components/sites/tio2-my/request-documents/malaysia-request-documents-form'
import {resolveMalaysiaRequestDocumentsPrefill} from '@/lib/request-documents/malaysia-request-documents-prefill'
import {toMalaysiaRequestDocumentsPageDto} from '@/lib/wordpress/request-documents-v01-dto'
import {malaysiaRequestDocumentsPageSource} from '@/tests/fixtures/tio2-my-request-documents-page'

const dto = toMalaysiaRequestDocumentsPageDto(malaysiaRequestDocumentsPageSource())

function renderPage(prefill = resolveMalaysiaRequestDocumentsPrefill({})) {
  return render(<MalaysiaRequestDocumentsPage page={dto} prefill={prefill} structuredData={null} />)
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', 'public-test-key')
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({success: true}), {
    status: 200, headers: {'content-type': 'application/json'},
  })))
})
afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.clearAllMocks() })

describe('CONV-DOC page and form', () => {
  it('submits directly to Web3Forms with the shared Malaysia forms routing key', async () => {
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', 'public-test-key')
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    const user = userEvent.setup()
    renderPage(resolveMalaysiaRequestDocumentsPrefill({product_grade: 'M-2196', document_types: ['safety']}))
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    await screen.findByRole('heading', {name: 'Document Request Received'})

    const calls = vi.mocked(fetch).mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    expect(String(calls[0]?.[0])).toBe('https://api.web3forms.com/submit')
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      access_key: 'public-test-key', full_name: 'Amina Tan', company: 'Example Co',
      business_email: 'amina@example.com', country_region: 'Malaysia', product_grade: 'M-2196',
      document_types: ['safety'], site_scope: 'tio2-my', page_id: 'CONV-DOC',
      workflow: 'request_documents',
    })
  })

  it('revalidates source attribution against the final visible context before browser submission', async () => {
    const user = userEvent.setup()
    renderPage(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2377', application_industry: 'Coatings', document_types: ['safety'],
      source_page_id: 'GRADE-M2377',
    }))
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.selectOptions(screen.getByLabelText(/Product Grade/u), 'M-350')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    await screen.findByRole('heading', {name: 'Document Request Received'})
    const calls = vi.mocked(fetch).mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).not.toHaveProperty('source_page_id')
    expect(payload).toMatchObject({product_grade: 'M-350', application_industry: 'Coatings'})
  })

  it('renders exact Buyer Clean modules, one form, shared Chrome and no false current nav', () => {
    const {container} = renderPage()
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Request Documents')
    expect(container.querySelectorAll('[data-request-documents-field]')).toHaveLength(8)
    expect(within(screen.getByRole('group', {name: /Document Types/u})).getAllByRole('checkbox')).toHaveLength(5)
    expect(screen.getByRole('form')).toBeTruthy()
    expect(within(screen.getByRole('form')).getByRole('link', {name: 'Privacy Policy'}).getAttribute('href')).toBe('/privacy-policy/')
    expect(container.querySelectorAll('header')).toHaveLength(1)
    expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.textContent).not.toContain('CURRENT')
    expect(within(container.querySelector('header')!).queryAllByRole('link', {current: 'page'})).toHaveLength(0)
    expect(screen.queryByText('Review your prefilled context')).toBeNull()
  })

  it('shows valid prefill visibly and keeps every value editable', () => {
    renderPage(resolveMalaysiaRequestDocumentsPrefill({
      product_grade: 'M-2196', document_types: ['safety'], application_industry: 'Coatings',
      source_page_id: 'PRODUCT-000',
    }))
    expect(screen.getByRole('heading', {name: 'Review your prefilled context'})).toBeTruthy()
    expect((screen.getByLabelText(/Product Grade/u) as HTMLSelectElement).value).toBe('M-2196')
    expect((screen.getByRole('checkbox', {name: /^Safety Documentation/u}) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText(/Application \/ Industry/u) as HTMLInputElement).value).toBe('Coatings')
  })

  it('renders the DOC-REACH other transport as a buyer-visible editable REACH Documentation selection', () => {
    const {container} = renderPage(resolveMalaysiaRequestDocumentsPrefill({
      document_types: 'other', additional_requirements: 'REACH documentation',
    }, {trustedSourcePageId: 'DOC-REACH'}))
    expect((screen.getByRole('checkbox', {name: /^REACH Documentation/u}) as HTMLInputElement).checked).toBe(true)
    expect((screen.getByLabelText(/Additional Requirements/u) as HTMLTextAreaElement).value).toBe('REACH documentation')
    expect(container.textContent).not.toContain('Other Documentation')
  })

  it('focuses a linked error summary and preserves entered values', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/^Company/u), 'Retained Company')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(summary.textContent).toContain('Review the highlighted fields')
    expect((screen.getByLabelText(/^Company/u) as HTMLInputElement).value).toBe('Retained Company')
    const name = screen.getByLabelText(/Full Name/u)
    await user.click(within(summary).getByRole('link', {name: /Full Name/u}))
    expect(document.activeElement).toBe(name)
    await user.click(within(summary).getByRole('link', {name: /Document Types/u}))
    expect(document.activeElement).toBe(screen.getAllByRole('checkbox')[0])
  })

  it('requires Other-only detail but preserves it when selections change', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('checkbox', {name: /^Other Documentation/u}))
    expect(screen.getByLabelText(/Additional Requirements/u).getAttribute('aria-required')).toBe('true')
    expect(screen.getByText(/Required when Other Documentation is your only selection/u)).toBeTruthy()
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    expect(screen.getByRole('alert').textContent).toContain('Describe the document you need.')
    expect(screen.getByText('Describe the document you need.')).toBeTruthy()
    const notes = screen.getByLabelText(/Additional Requirements/u)
    await user.type(notes, 'Specific declaration')
    await user.click(screen.getByRole('checkbox', {name: /^Safety Documentation/u}))
    await user.click(screen.getByRole('checkbox', {name: /^Other Documentation/u}))
    expect((notes as HTMLTextAreaElement).value).toBe('Specific declaration')
  })

  it('preserves a 501-character paste and focuses the accessible over-limit summary', async () => {
    const user = userEvent.setup()
    renderPage(resolveMalaysiaRequestDocumentsPrefill({product_grade: 'M-2196', document_types: ['safety']}))
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    const notes = screen.getByLabelText(/Additional Requirements/u) as HTMLTextAreaElement
    const longValue = '界'.repeat(501)
    await user.click(notes)
    await user.paste(longValue)
    expect(notes.value).toBe(longValue)
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    const summary = screen.getByRole('alert')
    expect(document.activeElement).toBe(summary)
    expect(summary.textContent).toContain('Keep Additional Requirements to 500 characters or fewer.')
    expect(notes.value).toBe(longValue)
  })

  it('uses a fresh idempotency token only after a failed request payload changes', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, kind: 'submission_unconfirmed'}), {status: 502}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, kind: 'submission_unconfirmed'}), {status: 502}))
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, kind: 'submission_unconfirmed'}), {status: 502}))
    const user = userEvent.setup()
    renderPage(resolveMalaysiaRequestDocumentsPrefill({product_grade: 'M-2196', document_types: ['safety']}))
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', {name: 'Try again'}))
    await screen.findByRole('alert')
    await user.type(screen.getByLabelText(/^Company/u), ' Updated')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    const bodies = vi.mocked(fetch).mock.calls.map((call) => JSON.parse(String(call[1]?.body)) as {request_token: string})
    expect(bodies[1]?.request_token).toBe(bodies[0]?.request_token)
    expect(bodies[2]?.request_token).not.toBe(bodies[0]?.request_token)
  })

  it('retries immediately with retained values and the same token, then confirms success', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response(JSON.stringify({ok: false, kind: 'submission_unconfirmed'}), {status: 502}))
      .mockImplementationOnce(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50))
        return new Response(JSON.stringify({success: true}), {
          status: 200, headers: {'content-type': 'application/json'},
        })
      })
    const user = userEvent.setup()
    renderPage(resolveMalaysiaRequestDocumentsPrefill({product_grade: 'M-2196', document_types: ['safety']}))
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Retained Company')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    await screen.findByRole('alert')
    await user.click(screen.getByRole('button', {name: 'Try again'}))
    expect((await screen.findByRole('button', {name: 'Submitting…'}) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByLabelText(/^Company/u) as HTMLInputElement).value).toBe('Retained Company')
    await screen.findByRole('heading', {name: 'Document Request Received'})
    expect(screen.getByRole('status').textContent).toContain('Document Request Received')
    const bodies = vi.mocked(fetch).mock.calls.map((call) => JSON.parse(String(call[1]?.body)) as {request_token: string})
    expect(bodies).toHaveLength(2)
    expect(bodies[1]?.request_token).toBe(bodies[0]?.request_token)
  })

  it('creates an RFC 4122 v4 token with secure random bytes when randomUUID is unavailable', () => {
    const cryptoApi = {getRandomValues: (bytes: Uint8Array) => { bytes.fill(0xab); return bytes }} as Crypto
    expect(createSecureRequestToken(cryptoApi)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u)
    expect(() => createSecureRequestToken({} as Crypto)).toThrow(/secure UUID/u)
  })

  it('shows receipt success only for the explicit API receipt response', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.selectOptions(screen.getByLabelText(/Product Grade/u), 'M-2196')
    await user.click(screen.getByRole('checkbox', {name: /^Safety Documentation/u}))
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    expect((await screen.findByRole('status')).textContent).toContain('Document Request Received')
    expect(fetch).toHaveBeenCalledOnce()
  })

  it('retains values and offers retry without contacting Web3Forms when the routing key is unavailable', async () => {
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '')
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'deprecated-key-must-be-ignored')
    const user = userEvent.setup()
    renderPage()
    await user.type(screen.getByLabelText(/Full Name/u), 'Amina Tan')
    await user.type(screen.getByLabelText(/^Company/u), 'Example Co')
    await user.type(screen.getByLabelText(/Business Email/u), 'amina@example.com')
    await user.type(screen.getByLabelText(/Country \/ Region/u), 'Malaysia')
    await user.selectOptions(screen.getByLabelText(/Product Grade/u), 'M-2196')
    await user.click(screen.getByRole('checkbox', {name: /^Safety Documentation/u}))
    await user.click(screen.getByRole('button', {name: 'Request Documents'}))
    expect((await screen.findByRole('alert')).textContent).toContain('Something went wrong')
    expect(screen.getByRole('button', {name: 'Try again'})).toBeTruthy()
    expect((screen.getByLabelText(/Full Name/u) as HTMLInputElement).value).toBe('Amina Tan')
    expect(screen.queryByText('Document Request Received')).toBeNull()
    expect(fetch).not.toHaveBeenCalled()
  })
})
