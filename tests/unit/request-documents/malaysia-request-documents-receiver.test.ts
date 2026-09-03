import {describe, expect, it, vi} from 'vitest'

import {submitMalaysiaRequestDocuments} from '@/lib/request-documents/malaysia-request-documents-receiver'
import {emptyMalaysiaRequestDocumentsValues} from '@/lib/request-documents/malaysia-request-documents-validation'

const values = {
  ...emptyMalaysiaRequestDocumentsValues,
  full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
  country_region: 'Malaysia', product_grade: 'M-2196', document_types: ['safety'],
}

describe('CONV-DOC receiver boundary', () => {
  it('fails closed when the verified receiver is not configured', async () => {
    await expect(submitMalaysiaRequestDocuments(values, {
      endpoint: null, token: null, requestToken: 'req-1', sourcePageId: null, marketId: null,
    })).resolves.toEqual({kind: 'unavailable'})
  })

  it('returns safe validation errors without calling a receiver', async () => {
    const fetcher = vi.fn()
    const result = await submitMalaysiaRequestDocuments(emptyMalaysiaRequestDocumentsValues, {
      endpoint: 'https://receiver.example.test', token: 'secret', requestToken: 'req-1', sourcePageId: null, marketId: null, fetcher,
    })
    expect(result.kind).toBe('validation_failed')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('confirms receipt only for an explicit positive acknowledgement', async () => {
    const ambiguous = vi.fn(async () => new Response(JSON.stringify({ok: true}), {status: 200}))
    await expect(submitMalaysiaRequestDocuments(values, {
      endpoint: 'https://receiver.example.test', token: 'secret', requestToken: 'req-1', sourcePageId: 'PRODUCT-000', marketId: 'MARKET-EU-DE', fetcher: ambiguous,
    })).resolves.toEqual({kind: 'submission_unconfirmed'})

    const confirmed = vi.fn(async () => new Response(JSON.stringify({receiptConfirmed: true}), {status: 200}))
    await expect(submitMalaysiaRequestDocuments(values, {
      endpoint: 'https://receiver.example.test', token: 'secret', requestToken: 'req-1', sourcePageId: 'PRODUCT-000', marketId: 'MARKET-EU-DE', fetcher: confirmed,
    })).resolves.toEqual({kind: 'receipt_confirmed'})
    const calls = confirmed.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({site_scope: 'tio2-my', page_id: 'CONV-DOC', request_token: 'req-1', source_page_id: 'PRODUCT-000', market_id: 'MARKET-EU-DE'})
    expect(payload).not.toHaveProperty('token')
  })

  it('maps network and server failures to an unconfirmed retryable state', async () => {
    const fetcher = vi.fn(async () => { throw new Error('secret receiver details') })
    await expect(submitMalaysiaRequestDocuments(values, {
      endpoint: 'https://receiver.example.test', token: 'secret', requestToken: 'stable-token', sourcePageId: null, marketId: null, fetcher,
    })).resolves.toEqual({kind: 'submission_unconfirmed'})
  })

  it('does not fabricate field errors for an unverified downstream 422 body', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({errors: {business_email: 'internal detail'}}), {status: 422}))
    await expect(submitMalaysiaRequestDocuments(values, {
      endpoint: 'https://receiver.example.test', token: 'secret', requestToken: 'stable-token', sourcePageId: null, marketId: null, fetcher,
    })).resolves.toEqual({kind: 'submission_unconfirmed'})
  })
})
