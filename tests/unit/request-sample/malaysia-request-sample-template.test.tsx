// @vitest-environment jsdom
import {cleanup,render,screen,waitFor,within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {MalaysiaRequestSamplePage} from '@/components/sites/tio2-my/request-sample/malaysia-request-sample-page'
import {resolveMalaysiaSamplePrefill} from '@/lib/request-sample/malaysia-request-sample-prefill'
import {toMalaysiaRequestSamplePageDto} from '@/lib/wordpress/request-sample-v01-dto'
import {malaysiaRequestSamplePageSource} from '@/tests/fixtures/tio2-my-request-sample-page'

const dto=toMalaysiaRequestSamplePageDto(malaysiaRequestSamplePageSource())
const renderPage=(prefill=resolveMalaysiaSamplePrefill({}),receiverReady=true)=>render(<MalaysiaRequestSamplePage page={dto} prefill={prefill} receiverReady={receiverReady} structuredData={null}/>)
beforeEach(()=>vi.stubGlobal('fetch',vi.fn(async()=>new Response(JSON.stringify({ok:true,receipt_confirmed:true,kind:'receipt_confirmed'}),{status:200}))))
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.clearAllMocks()})

async function fillRequired(user:ReturnType<typeof userEvent.setup>){
  await user.selectOptions(screen.getByLabelText(/Product grade/u),'M-2196');await user.selectOptions(screen.getByLabelText(/^Application/u),'coatings')
  await user.type(screen.getByLabelText(/What do you need to evaluate/u),'Evaluate dispersion.');await user.type(screen.getByLabelText(/Contact name/u),'Amina Tan')
  await user.type(screen.getByLabelText(/Company or organisation/u),'Example Co');await user.type(screen.getByLabelText(/Business email/u),'amina@example.com');await user.type(screen.getByLabelText(/Destination country or market/u),'Malaysia')
}

describe('CONV-SAMPLE page and form',()=>{
  it('renders exact page order, one form, four initial-DOM answers and shared Chrome with no current nav',()=>{
    const {container}=renderPage();expect(screen.getAllByRole('heading',{level:1})).toHaveLength(1);expect(screen.getByRole('heading',{level:1}).textContent).toBe('Request a Titanium Dioxide Sample for Technical Evaluation')
    expect(container.querySelectorAll('[data-sample-field]')).toHaveLength(11);expect(screen.getByRole('form')).toBeTruthy();expect(container.querySelectorAll('header')).toHaveLength(1);expect(container.querySelectorAll('footer')).toHaveLength(1)
    expect(container.textContent).not.toContain('CURRENT');expect(within(container.querySelector('header')!).queryAllByRole('link',{current:'page'})).toHaveLength(0)
    for(const item of dto.faq.items)expect(container.textContent).toContain(item.answer)
    expect(container.textContent).not.toMatch(/Free sample|Contact us|Sample quantity Required/iu)
  })
  it('server-renders the approved unavailable panel instead of usable controls when receiver readiness is false',()=>{
    renderPage(resolveMalaysiaSamplePrefill({}),false)
    expect(screen.queryByRole('form')).toBeNull();expect(screen.queryByLabelText(/Product grade/u)).toBeNull();expect(screen.queryByRole('button',{name:'Submit Sample Request for Review'})).toBeNull()
    expect(screen.getByRole('heading',{name:'We cannot confirm sample requests right now.'})).toBeTruthy();expect(screen.getByText('The sample request form is not available. No request has been confirmed. Please try again later.')).toBeTruthy();expect(screen.queryByText(/Contact us/iu)).toBeNull()
  })
  it('uses disclosure buttons with accurate expanded state and linked FAQ panels',async()=>{
    const user=userEvent.setup();renderPage();const buttons=dto.faq.items.map((item)=>screen.getByRole('button',{name:item.question}))
    expect(buttons[0]?.getAttribute('aria-expanded')).toBe('true');expect(buttons[1]?.getAttribute('aria-expanded')).toBe('false')
    const firstPanel=document.getElementById(buttons[0]!.getAttribute('aria-controls')!);const secondPanel=document.getElementById(buttons[1]!.getAttribute('aria-controls')!)
    expect(firstPanel?.hasAttribute('hidden')).toBe(false);expect(firstPanel?.getAttribute('aria-labelledby')).toBe(buttons[0]!.id);expect(secondPanel?.hasAttribute('hidden')).toBe(true);expect(secondPanel?.getAttribute('aria-labelledby')).toBe(buttons[1]!.id)
    buttons[1]!.focus();await user.keyboard('{Enter}');expect(buttons[1]?.getAttribute('aria-expanded')).toBe('true');expect(secondPanel?.hasAttribute('hidden')).toBe(false);expect(document.activeElement).toBe(buttons[1])
  })
  it('sets aria-busy only while a submission is in flight',async()=>{
    let resolveRequest:(value:Response)=>void=()=>undefined
    vi.mocked(fetch).mockImplementationOnce(()=>new Promise<Response>((resolve)=>{resolveRequest=resolve}))
    const user=userEvent.setup();renderPage();await fillRequired(user);const form=screen.getByRole('form');await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}))
    await waitFor(()=>expect(form.getAttribute('aria-busy')).toBe('true'));resolveRequest(new Response(JSON.stringify({ok:true,receipt_confirmed:true,kind:'receipt_confirmed'}),{status:200}))
    await screen.findByRole('heading',{name:'Your sample request has been received.'});expect(form.hasAttribute('aria-busy')).toBe(false)
  })
  it('shows accepted prefill visibly and allows every buyer value to be removed',async()=>{
    const user=userEvent.setup();renderPage(resolveMalaysiaSamplePrefill({source_page_id:'GRADE-M2377',grade_id:'M-2377',application_id:'coatings',process_context:'sulfate',destination:'United Kingdom',document_needs:['tds']}))
    expect(screen.getByRole('heading',{name:'Context brought from your previous page'})).toBeTruthy();expect(screen.getAllByRole('button',{name:/Remove/u}).length).toBeGreaterThanOrEqual(5)
    await user.click(screen.getAllByRole('button',{name:'Change'}).at(-1)!);expect(document.activeElement?.id).toBe('sample-documents')
    await user.click(screen.getByRole('button',{name:'Remove Grade'}));expect((screen.getByLabelText(/Product grade/u) as HTMLSelectElement).value).toBe('')
  })
  it('focuses validation summary, preserves 2001 Unicode characters and conditionally requires Other',async()=>{
    const user=userEvent.setup();renderPage();await user.selectOptions(screen.getByLabelText(/^Application/u),'other');expect(screen.getByLabelText(/Describe the application/u).getAttribute('aria-required')).toBe('true')
    const objective=screen.getByLabelText(/What do you need to evaluate/u) as HTMLTextAreaElement;const long='😀'.repeat(2001);await user.click(objective);await user.paste(long);await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}))
    const summary=screen.getByRole('alert');expect(document.activeElement).toBe(summary);expect(summary.textContent).toContain('2,000 characters');expect(objective.value).toBe(long)
  })
  it('keeps Other text but clears its stale error after a different application is selected',async()=>{
    const user=userEvent.setup();renderPage();await user.selectOptions(screen.getByLabelText(/^Application/u),'other');const other=screen.getByLabelText(/Describe the application/u);await user.click(other);await user.paste('界'.repeat(501));await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}));expect(screen.getByRole('alert').textContent).toContain('500 characters')
    await user.selectOptions(screen.getByLabelText(/^Application/u),'coatings');expect(screen.queryByLabelText(/Describe the application/u)).toBeNull();await fillRequired(user);await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}));await screen.findByRole('heading',{name:'Your sample request has been received.'})
  })
  it('directly retries with retained values and same token, rotating only after a material edit',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ok:false,receipt_confirmed:false,kind:'submission_unconfirmed'}),{status:502})).mockResolvedValueOnce(new Response(JSON.stringify({ok:false,receipt_confirmed:false,kind:'submission_unconfirmed'}),{status:502})).mockResolvedValueOnce(new Response(JSON.stringify({ok:true,receipt_confirmed:true,kind:'receipt_confirmed'}),{status:200}))
    const user=userEvent.setup();renderPage();await fillRequired(user);await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}));await screen.findByRole('heading',{name:'We could not confirm that your request was received.'});await user.click(screen.getByRole('button',{name:'Try again'}));await screen.findByRole('heading',{name:'We could not confirm that your request was received.'});await user.type(screen.getByLabelText(/Company or organisation/u),' Updated');await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}));await screen.findByRole('heading',{name:'Your sample request has been received.'})
    const bodies=vi.mocked(fetch).mock.calls.map((call)=>JSON.parse(String(call[1]?.body)) as {idempotency_key:string});expect(bodies[1]?.idempotency_key).toBe(bodies[0]?.idempotency_key);expect(bodies[2]?.idempotency_key).not.toBe(bodies[0]?.idempotency_key)
  })
  it('replaces a known unavailable form with the approved restricted panel',async()=>{
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ok:false,receipt_confirmed:false,kind:'unavailable'}),{status:503}))
    const user=userEvent.setup();renderPage();await fillRequired(user);await user.click(screen.getByRole('button',{name:'Submit Sample Request for Review'}));await screen.findByRole('heading',{name:'We cannot confirm sample requests right now.'})
    expect(screen.queryByLabelText(/Product grade/u)).toBeNull();expect(screen.queryByRole('button',{name:'Submit Sample Request for Review'})).toBeNull();expect(screen.queryByText(/Contact us/iu)).toBeNull()
  })
})
