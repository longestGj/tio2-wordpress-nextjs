import {afterEach, describe, expect, it, vi} from 'vitest'
import {submitMalaysiaRfqServerCompatibility} from '@/lib/rfq/malaysia-rfq-server-receiver'
import type {MalaysiaRfqSubmission} from '@/lib/rfq/malaysia-rfq-receiver'

const submission: MalaysiaRfqSubmission = {
  grade_id: 'M-350', application_id: 'Coatings', quantity_mt: '20',
  destination_country: 'Malaysia', destination_port_city: '', company_name: 'Example Industries',
  contact_name: 'A Buyer', business_email: 'buyer@example.com', phone_whatsapp: '',
  website: '', additional_requirements: '', source_page_id: null,
}
afterEach(() => vi.useRealTimers())

describe('retained RFQ server compatibility contract', () => {
  it('maps explicit fields, fixes MT units and excludes unknown fields and unapproved interest', async () => {
    let payload: Record<string, unknown> = {}
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      payload = JSON.parse(String(init?.body))
      return Response.json({success: true})
    })
    await expect(submitMalaysiaRfqServerCompatibility({...submission, interest: 'unapproved', injected: 'excluded'} as MalaysiaRfqSubmission, {accessKey: 'test-key', fetcher})).resolves.toEqual({kind: 'receipt_confirmed'})
    expect(payload.quantity_unit).toBe('MT')
    expect(payload).not.toHaveProperty('interest')
    expect(payload).not.toHaveProperty('injected')
    expect(payload).not.toHaveProperty('source_page_id')
    for (const [field, value] of Object.entries(submission).filter(([field]) => field !== 'source_page_id')) expect(payload[field]).toBe(value)
    expect(payload).toMatchObject({site_scope: 'tio2-my', page_id: 'CONV-RFQ', workflow_type: 'rfq', locale: 'en'})
    await submitMalaysiaRfqServerCompatibility({...submission, source_page_id: 'RES-ORIGIN', interest: 'alternative-origin-sourcing'}, {accessKey: 'test-key', fetcher, environment: 'local-prerelease'})
    expect(payload).toMatchObject({source_page_id: 'RES-ORIGIN', interest: 'alternative-origin-sourcing', environment: 'local-prerelease', test_run_id: payload.request_token})
  })

  it.each(['fetch', 'body'] as const)('bounds noncooperative %s independently of abort', async stage => {
    vi.useFakeTimers()
    let signal: AbortSignal | null | undefined
    const response = Response.json({success: true})
    vi.spyOn(response, 'json').mockImplementation(() => new Promise(() => undefined))
    const fetcher: typeof fetch = vi.fn(async (_url, init) => {
      signal = init?.signal
      return stage === 'fetch' ? new Promise<Response>(() => undefined) : response
    })
    let result: unknown = 'pending'
    void submitMalaysiaRfqServerCompatibility(submission, {accessKey: 'test-key', fetcher, timeoutMs: 10}).then(value => {result = value})
    await vi.advanceTimersByTimeAsync(9)
    expect(result).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    expect(result).toEqual({kind: 'submission_unconfirmed'})
    expect(signal?.aborted).toBe(true)
  })

  it.each([0, -1, NaN, Infinity])('normalizes invalid timeout %s to the original ten-second deadline', async timeoutMs => {
    vi.useFakeTimers()
    let result: unknown = 'pending'
    const fetcher = vi.fn(() => new Promise<Response>(() => undefined))
    void submitMalaysiaRfqServerCompatibility(submission, {accessKey: 'test-key', fetcher, timeoutMs}).then(value => {result = value})
    await vi.advanceTimersByTimeAsync(9_999)
    expect(result).toBe('pending')
    await vi.advanceTimersByTimeAsync(1)
    expect(result).toEqual({kind: 'submission_unconfirmed'})
  })
})
