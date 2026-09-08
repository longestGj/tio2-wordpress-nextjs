import {describe, expect, it, vi} from 'vitest'

import {
  MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS,
  submitMalaysiaRequestDocuments,
} from '@/lib/request-documents/malaysia-request-documents-receiver'
import {emptyMalaysiaRequestDocumentsValues} from '@/lib/request-documents/malaysia-request-documents-validation'

const values = {
  ...emptyMalaysiaRequestDocumentsValues,
  full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
  country_region: 'Malaysia', product_grade: 'M-2196', document_types: ['safety'],
}

const options = {
  accessKey: 'test-access-key', requestToken: 'req-1', sourcePageId: null, marketId: null,
}

describe('CONV-DOC receiver boundary', () => {
  it('returns the shared provider acceptance result', async () => {
    const fetcher = vi.fn(async () => Response.json({success: true}))
    const result = await submitMalaysiaRequestDocuments(values, {...options, fetcher})
    expect(result.kind).toBe('provider_accepted')
    const calls=fetcher.mock.calls as unknown as Array<[RequestInfo|URL,RequestInit]>
    expect(JSON.parse(String(calls[0]?.[1]?.body))).toMatchObject({
      site_scope: 'tio2-my', page_id: 'CONV-DOC', workflow_type: 'documents', locale: 'en', request_token: 'req-1',
    })
  })
  it('submits through the fixed Web3Forms browser contract', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))

    await expect(submitMalaysiaRequestDocuments(values, {
      accessKey: 'test-access-key', requestToken: 'req-1', sourcePageId: 'PRODUCT-000',
      marketId: 'MARKET-EU-DE', fetcher,
    })).resolves.toMatchObject({kind: 'provider_accepted'})

    const calls = fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    expect(String(calls[0]?.[0])).toBe('https://api.web3forms.com/submit')
    expect(calls[0]?.[1]?.headers).toEqual({'content-type': 'application/json'})
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      access_key: 'test-access-key', email: 'amina@example.com', site_scope: 'tio2-my',
      page_id: 'CONV-DOC', workflow_type: 'documents', locale: 'en', request_token: 'req-1',
      source_page_id: 'PRODUCT-000', market_id: 'MARKET-EU-DE',
    })
    expect(payload).not.toHaveProperty('recipient')
    expect(payload).not.toHaveProperty('to')
    expect(payload).not.toHaveProperty('environment')
    expect(payload).not.toHaveProperty('test_run_id')
    expect(payload.subject).toBe('TiO2 Malaysia document request')
  })

  it('uses the request token as the local prerelease test run ID', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await submitMalaysiaRequestDocuments(values, {...options, fetcher, environment: 'local-prerelease'})
    const payload = JSON.parse(String((fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>)[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      environment: 'local-prerelease', test_run_id: 'req-1',
      subject: '[LOCAL PRERELEASE] TiO2 Malaysia document request',
    })
    expect(payload).not.toHaveProperty('recipient')
  })

  it('cannot redirect the public routing key or buyer data to another endpoint', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    const injectedOptions = {...options, endpoint: 'https://attacker.example.test/collect', fetcher}
    await submitMalaysiaRequestDocuments(values, injectedOptions)
    const calls = fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    expect(String(calls[0]?.[0])).toBe('https://api.web3forms.com/submit')
  })

  it('normalizes the provider reply-to address with the approved form fields', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await submitMalaysiaRequestDocuments({...values, business_email: '  amina@example.com  '}, {...options, fetcher})
    const calls = fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload.email).toBe('amina@example.com')
    expect(payload.business_email).toBe('amina@example.com')
  })

  it('fails closed when the verified receiver is not configured', async () => {
    await expect(submitMalaysiaRequestDocuments(values, {
      ...options, accessKey: null,
    })).resolves.toMatchObject({kind: 'unavailable'})
  })

  it('returns safe validation errors without calling a receiver', async () => {
    const fetcher = vi.fn()
    const result = await submitMalaysiaRequestDocuments(emptyMalaysiaRequestDocumentsValues, {
      ...options, fetcher,
    })
    expect(result.kind).toBe('validation_failed')
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('rejects a provider payload larger than the approved 16 KB boundary', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await expect(submitMalaysiaRequestDocuments({...values, full_name: 'a'.repeat(17 * 1024)}, {
      ...options, fetcher,
    })).resolves.toMatchObject({kind: 'submission_unconfirmed'})
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('confirms receipt only for an explicit positive acknowledgement', async () => {
    const ambiguous = vi.fn(async () => new Response(JSON.stringify({ok: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await expect(submitMalaysiaRequestDocuments(values, {
      ...options, sourcePageId: 'PRODUCT-000', marketId: 'MARKET-EU-DE', fetcher: ambiguous,
    })).resolves.toMatchObject({kind: 'submission_unconfirmed'})

    const confirmed = vi.fn(async () => new Response(JSON.stringify({success: true}), {
      status: 200, headers: {'content-type': 'application/json'},
    }))
    await expect(submitMalaysiaRequestDocuments(values, {
      ...options, sourcePageId: 'PRODUCT-000', marketId: 'MARKET-EU-DE', fetcher: confirmed,
    })).resolves.toMatchObject({kind: 'provider_accepted'})
    const calls = confirmed.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({site_scope: 'tio2-my', page_id: 'CONV-DOC', request_token: 'req-1', source_page_id: 'PRODUCT-000', market_id: 'MARKET-EU-DE'})
    expect(payload).not.toHaveProperty('recipient')
    expect(payload).not.toHaveProperty('to')
  })

  it('maps network and server failures to an unconfirmed retryable state', async () => {
    const fetcher = vi.fn(async () => { throw new Error('secret receiver details') })
    await expect(submitMalaysiaRequestDocuments(values, {
      ...options, requestToken: 'stable-token', fetcher,
    })).resolves.toMatchObject({kind: 'submission_unconfirmed'})
  })

  it('does not fabricate field errors for an unverified downstream 422 body', async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({errors: {business_email: 'internal detail'}}), {status: 422}))
    await expect(submitMalaysiaRequestDocuments(values, {
      ...options, requestToken: 'stable-token', fetcher,
    })).resolves.toMatchObject({kind: 'provider_rejected'})
  })

  it.each([
    [200, 'application/json', {}],
    [200, 'application/json', {success: false}],
    [202, 'application/json', {success: true}],
    [307, 'application/json', {success: true}],
    [308, 'application/json', {success: true}],
    [500, 'application/json', {success: true}],
    [200, 'text/plain', {success: true}],
    [200, 'text/plain; profile=application/json', {success: true}],
  ])('rejects ambiguous provider response %#', async (status, contentType, body) => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {
      status, headers: {'content-type': contentType},
    }))
    await expect(submitMalaysiaRequestDocuments(values, {...options, fetcher}))
      .resolves.toMatchObject({kind: expect.not.stringMatching('provider_accepted')})
  })

  it('bounds the complete provider exchange, including response parsing', async () => {
    vi.useFakeTimers()
    try {
      const response = new Response('{}', {status: 200, headers: {'content-type': 'application/json'}})
      vi.spyOn(response, 'json').mockImplementation(() => new Promise<never>(() => undefined))
      const fetcher = vi.fn(async () => response)
      const pending = submitMalaysiaRequestDocuments(values, {...options, fetcher, timeoutMs: 50})
      await vi.advanceTimersByTimeAsync(50)
      await expect(pending).resolves.toMatchObject({kind: 'submission_unconfirmed'})
      expect(MALAYSIA_REQUEST_DOCUMENTS_SUBMISSION_TIMEOUT_MS).toBe(12_000)
    } finally {
      vi.useRealTimers()
    }
  })
})
