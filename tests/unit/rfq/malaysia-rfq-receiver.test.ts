import {describe, expect, it, vi} from 'vitest'

import {submitMalaysiaRfq, type MalaysiaRfqSubmission} from '@/lib/rfq/malaysia-rfq-receiver'

const submission: MalaysiaRfqSubmission = {
  grade_id: 'M-350', application_id: 'Coatings', quantity_mt: '20',
  destination_country: 'Malaysia', destination_port_city: '', company_name: 'Example Industries',
  contact_name: 'A Buyer', business_email: 'buyer@example.com', phone_whatsapp: '',
  website: '', additional_requirements: '', source_page_id: null,
}

describe('CONV-RFQ Web3Forms receiver', () => {
  it('confirms receipt only for an explicit success acknowledgement', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true, body: {message: 'Email sent successfully!'}}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await expect(submitMalaysiaRfq(submission, {accessKey: 'test-key', fetcher})).resolves.toEqual({kind: 'receipt_confirmed'})
    const calls = fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const body = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(body).toMatchObject({site_scope: 'tio2-my', page_id: 'CONV-RFQ'})
  })

  it.each([
    [200, {}], [200, {success: false}], [202, {success: true}], [500, {success: true}],
  ])('treats ambiguous status/payload %# as unconfirmed', async (status, payload) => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(payload), {
      status, headers: {'content-type': 'application/json'},
    }))
    await expect(submitMalaysiaRfq(submission, {accessKey: 'test-key', fetcher})).resolves.toEqual({kind: 'submission_unconfirmed'})
  })

  it('fails closed without receiver configuration or after a network error', async () => {
    await expect(submitMalaysiaRfq(submission, {accessKey: null, fetcher: vi.fn()})).resolves.toEqual({kind: 'service_unavailable'})
    await expect(submitMalaysiaRfq(submission, {
      accessKey: 'test-key', fetcher: vi.fn(async () => { throw new Error('offline') }),
    })).resolves.toEqual({kind: 'submission_unconfirmed'})
  })
})
