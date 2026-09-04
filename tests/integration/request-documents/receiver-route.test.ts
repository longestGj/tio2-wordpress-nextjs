import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {POST} from '@/app/api/tio2-my/request-documents/route'

const validPayload = {
  full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
  country_region: 'Malaysia', product_grade: 'M-2196', document_types: ['safety'],
  application_industry: '', additional_requirements: '', request_token: '72a190ef-315a-4a5a-91be-0329d316eb39',
  source_page_id: 'PRODUCT-000',
}

const request = (body: unknown, headers: Record<string, string> = {}) => new Request('https://tio2malaysia.com/api/tio2-my/request-documents', {
  method: 'POST', headers: {'content-type': 'application/json', origin: 'https://tio2malaysia.com', ...headers}, body: JSON.stringify(body),
})
const providerResponse = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: {'content-type': 'application/json'},
})

beforeEach(() => { vi.stubEnv('SITE_ID', 'tio2-my') })
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('CONV-DOC same-origin receiver route', () => {
  it('revalidates untrusted input and exposes only safe field errors', async () => {
    const response = await POST(request({...validPayload, product_grade: 'TIOVAR'}))
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ok: false, kind: 'validation_failed', errors: {product_grade: 'Select a Product Grade.'}})
  })

  it('fails closed with a release-safe unavailable response when configuration is missing', async () => {
    const response = await POST(request(validPayload))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ok: false, kind: 'unavailable'})
  })

  it('returns success only after a positive downstream receipt', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'server-only-test-key')
    const downstream = vi.fn(async () => providerResponse({success: true}))
    vi.stubGlobal('fetch', downstream)
    const response = await POST(request(validPayload))
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ok: true, kind: 'receipt_confirmed'})
    const calls = downstream.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    expect(String(calls[0]?.[0])).toBe('https://api.web3forms.com/submit')
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      access_key: 'server-only-test-key', site_scope: 'tio2-my', page_id: 'CONV-DOC',
      workflow: 'request_documents', request_token: validPayload.request_token,
    })
    expect(payload).not.toHaveProperty('recipient')
    expect(payload).not.toHaveProperty('to')
  })

  it('does not claim receipt for ambiguous downstream responses', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'server-only-test-key')
    vi.stubGlobal('fetch', vi.fn(async () => providerResponse({ok: true})))
    const response = await POST(request(validPayload))
    expect(response.status).toBe(502)
    expect(await response.json()).toEqual({ok: false, kind: 'submission_unconfirmed'})
  })

  it('does not use the retired generic receiver configuration', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_RECEIVER_URL', 'https://receiver.example.test')
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_RECEIVER_TOKEN', 'retired-secret')
    const downstream = vi.fn()
    vi.stubGlobal('fetch', downstream)
    const response = await POST(request(validPayload))
    expect(response.status).toBe(503)
    expect(await response.json()).toEqual({ok: false, kind: 'unavailable'})
    expect(downstream).not.toHaveBeenCalled()
  })

  it('rejects the endpoint outside the active Malaysia deployment', async () => {
    vi.stubEnv('SITE_ID', 'tio2-a')
    expect((await POST(request(validPayload))).status).toBe(404)
    vi.stubEnv('SITE_ID', 'tio2-b')
    expect((await POST(request(validPayload))).status).toBe(404)
  })

  it('rejects cross-origin, non-JSON and oversized requests before parsing', async () => {
    expect((await POST(request(validPayload, {origin: 'https://example.test'}))).status).toBe(403)
    expect((await POST(request(validPayload, {origin: 'null'}))).status).toBe(403)
    expect((await POST(new Request('https://tio2malaysia.com/api/tio2-my/request-documents', {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(validPayload),
    }))).status).toBe(403)
    expect((await POST(request(validPayload, {'content-type': 'text/plain'}))).status).toBe(415)
    expect((await POST(request(validPayload, {'content-length': '20000'}))).status).toBe(413)
    expect((await POST(new Request('https://tio2malaysia.com/api/tio2-my/request-documents', {
      method: 'POST', headers: {'content-type': 'application/json', origin: 'https://tio2malaysia.com'}, body: '{not-json',
    }))).status).toBe(400)
    expect((await POST(new Request('https://tio2malaysia.com/api/tio2-my/request-documents', {
      method: 'POST', headers: {'content-type': 'application/json', origin: 'https://tio2malaysia.com'}, body: 'x'.repeat(17 * 1024),
    }))).status).toBe(413)
  })

  it('removes forged source attribution and retains allowlisted market attribution', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'server-only-test-key')
    const downstream = vi.fn(async () => providerResponse({success: true}))
    vi.stubGlobal('fetch', downstream)
    await POST(request({...validPayload, source_page_id: 'FOREIGN-999', market_id: 'MARKET-EU-DE'}))
    const calls = downstream.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).not.toHaveProperty('source_page_id')
    expect(payload.market_id).toBe('MARKET-EU-DE')
  })

  it('does not forward a registered source attribution after the visible Grade/context becomes mismatched', async () => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'server-only-test-key')
    const downstream = vi.fn(async () => providerResponse({success: true}))
    vi.stubGlobal('fetch', downstream)
    await POST(request({...validPayload,
      product_grade: 'M-350', application_industry: 'Coatings', source_page_id: 'GRADE-M2377',
    }))
    const calls = downstream.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload).not.toHaveProperty('source_page_id')
    expect(payload).toMatchObject({product_grade: 'M-350', application_industry: 'Coatings'})
  })

  it.each([
    ['M-2377', 'Coatings', 'APP-COAT', true],
    ['M-2377', 'Plastics', 'APP-COAT', false],
    ['M-350', 'Chloride', 'PRODUCT-PROC-CL', true],
    ['M-2377', 'Sulfate', 'PRODUCT-PROC-CL', false],
  ] as const)('revalidates %s / %s against specific source %s before forwarding', async (grade, context, sourcePageId, forwarded) => {
    vi.stubEnv('TIO2_MY_REQUEST_DOCUMENTS_WEB3FORMS_ACCESS_KEY', 'server-only-test-key')
    const downstream = vi.fn(async () => providerResponse({success: true}))
    vi.stubGlobal('fetch', downstream)
    await POST(request({...validPayload,
      product_grade: grade, application_industry: context, source_page_id: sourcePageId,
    }))
    const calls = downstream.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>
    const payload = JSON.parse(String(calls[0]?.[1]?.body)) as Record<string, unknown>
    expect(payload.source_page_id === sourcePageId).toBe(forwarded)
    expect(payload).toMatchObject({product_grade: grade, application_industry: context})
  })
})
