// @vitest-environment jsdom

import {cleanup, render, screen, waitFor, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {MalaysiaRfqPage} from '@/components/sites/tio2-my/request-a-quote/malaysia-rfq-page'
import {toMalaysiaRfqPageDto} from '@/lib/wordpress/rfq-page-v01-dto'
import {malaysiaRfqPageSource} from '@/tests/fixtures/tio2-my-rfq-page'

const receiver = vi.fn()
const transitionMocks = vi.hoisted(() => ({navigate: vi.fn()}))
vi.mock('@/lib/thank-you/malaysia-thank-you-session', async (original) => ({
  ...await original(), navigateToMalaysiaThankYou: transitionMocks.navigate,
}))

const dto = toMalaysiaRfqPageDto(malaysiaRfqPageSource())

function renderPage() {
  return render(
    <MalaysiaRfqPage
      page={dto}
      receiverAvailable
      privacyPolicyHref="/privacy-policy/"
      structuredData={<script type="application/ld+json">{'{"@graph":[]}'}</script>}
    />,
  )
}

async function fillValidRfq(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText(/Product \/ Grade/u), 'M-350')
  await user.selectOptions(screen.getByLabelText(/^Application/u), 'Coatings')
  await user.type(screen.getByLabelText(/Required Quantity/u), '20')
  await user.type(screen.getByLabelText(/Destination Country/u), 'Malaysia')
  await user.type(screen.getByLabelText(/Company Name/u), 'Example Industries')
  await user.type(screen.getByLabelText(/Your Name/u), 'A Buyer')
  await user.type(screen.getByLabelText(/Business Email/u), 'buyer@example.com')
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '01234567-89ab-cdef-0123-456789abcdef')
  receiver.mockReset()
  receiver.mockResolvedValue(Response.json({success: true}))
  vi.stubGlobal('fetch', receiver)
})
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('CONV-RFQ template and form', () => {
  it('renders the exact Buyer Clean structure with one shared Chrome and permanent task links', () => {
    const {container} = renderPage()
    expect(screen.getAllByRole('heading', {level: 1})).toHaveLength(1)
    expect(screen.getByRole('heading', {level: 1}).textContent).toBe('Request a Titanium Dioxide Quote')
    expect(container.querySelectorAll('[data-module]')).toHaveLength(0)
    expect(container.innerHTML).not.toMatch(/data-site-scope|data-page-id|data-source-page/u)
    expect(screen.getByRole('form')).toBeTruthy()
    expect(within(screen.getByRole('form')).getByRole('link', {name: 'Privacy Policy'}).getAttribute('href')).toBe('/privacy-policy/')
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
    expect(receiver).not.toHaveBeenCalled()
  })

  it('navigates only after the provider explicitly accepts it', async () => {
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
    await waitFor(() => expect(transitionMocks.navigate).toHaveBeenCalledWith('quote'))
    expect(receiver).toHaveBeenCalledOnce()
    expect(receiver.mock.calls[0]?.[0]).toBe('https://api.web3forms.com/submit')
  })

  it('reuses the request token for an unchanged manual retry and rotates it after buyer input changes', async () => {
    receiver.mockResolvedValueOnce(Response.json({success:false})).mockResolvedValueOnce(Response.json({success:false})).mockResolvedValueOnce(Response.json({success:true}))
    const user=userEvent.setup();renderPage();await fillValidRfq(user)
    await user.click(screen.getByRole('button',{name:'REQUEST QUOTE'}));await screen.findByRole('button',{name:'TRY AGAIN'})
    await user.click(screen.getByRole('button',{name:'TRY AGAIN'}));await user.click(screen.getByRole('button',{name:'REQUEST QUOTE'}));await screen.findByRole('button',{name:'TRY AGAIN'})
    await user.type(screen.getByLabelText(/Company Name/u),' Updated');await user.click(screen.getByRole('button',{name:'REQUEST QUOTE'}))
    await waitFor(()=>expect(transitionMocks.navigate).toHaveBeenCalledWith('quote'))
    const bodies=receiver.mock.calls.map((call)=>JSON.parse(String(call[1]?.body)) as {request_token:string})
    expect(bodies).toHaveLength(3);expect(bodies[1]?.request_token).toBe(bodies[0]?.request_token);expect(bodies[2]?.request_token).not.toBe(bodies[0]?.request_token)
  })

  it('restores fields and actions after a timeout maps to unconfirmed', async () => {
    let settle!: (result: {kind: 'submission_unconfirmed'}) => void
    receiver.mockImplementation(() => new Promise((resolve) => { settle = (result) => resolve(Response.json(result)) }))
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
    expect((screen.getByRole('button', {name: 'SUBMITTING…'}) as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('form').querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(true)

    settle({kind: 'submission_unconfirmed'})
    expect((await screen.findByRole('button', {name: 'TRY AGAIN'}) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', {name: 'REQUEST QUOTE'}) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('form').querySelector('fieldset') as HTMLFieldSetElement).disabled).toBe(false)
    expect((screen.getByLabelText(/Company Name/u) as HTMLInputElement).value).toBe('Example Industries')
    expect(screen.queryByText('Thank you. We’ve received your quotation request.')).toBeNull()
  })

  it('renders the approved unavailable state without a fake receiver or Contact fallback', () => {
    const {container} = render(
      <MalaysiaRfqPage
        page={dto}
        receiverAvailable={false}
        privacyPolicyHref={null}
        structuredData={null}
      />,
    )
    expect(screen.getByRole('status').textContent).toContain('The quotation request form is temporarily unavailable.')
    expect(container.textContent).not.toContain('Contact')
  })
})
  it('retries only the receipt transition after confirmed receipt storage fails', async () => {
    transitionMocks.navigate.mockImplementationOnce(() => {throw new Error('Storage unavailable')})
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
    await waitFor(() => expect(transitionMocks.navigate).toHaveBeenCalledWith('quote'))
    await user.click(screen.getByRole('button', {name: 'TRY AGAIN'}))
    await user.click(screen.getByRole('button', {name: 'REQUEST QUOTE'}))
    await waitFor(() => expect(transitionMocks.navigate).toHaveBeenCalledTimes(2))
    await user.click(screen.getByRole('button', {name: 'REQUEST QUOTE'}))
    expect(transitionMocks.navigate).toHaveBeenCalledTimes(2)
    expect(receiver).toHaveBeenCalledOnce()
    expect(receiver.mock.calls[0]?.[0]).toBe('https://api.web3forms.com/submit')
  })
