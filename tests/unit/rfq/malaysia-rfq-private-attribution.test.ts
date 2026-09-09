import {afterEach, describe, expect, it, vi} from 'vitest'

import {POST as recordAttribution} from '../../../app/api/rfq/context/route'
import {POST as submitRfq} from '../../../app/api/rfq/submit/route'
import {
  createMalaysiaRfqAttributionToken,
  isMalaysiaApplicationHubReferer,
  isMalaysiaRfqAttributionToken,
  MALAYSIA_RFQ_ATTRIBUTION_COOKIE,
  resolveMalaysiaRfqAttributionToken,
  resolveMalaysiaRfqRefererSource,
} from '@/lib/rfq/malaysia-rfq-private-attribution'
import {NextRequest} from 'next/server'

const secret = 'test-only-private-attribution-secret-32-chars'
const buyer = {
  grade_id: 'M-350', application_id: 'Coatings', quantity_mt: '12',
  destination_country: 'Malaysia', destination_port_city: '', company_name: 'Example Industries',
  contact_name: 'A Buyer', business_email: 'buyer@example.com', phone_whatsapp: '',
  website: '', additional_requirements: '',
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('private RFQ attribution', () => {
  it('creates an opaque token and rejects missing, short, or altered secrets', () => {
    const token = createMalaysiaRfqAttributionToken(secret)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(token).not.toContain('APP-000')
    expect(isMalaysiaRfqAttributionToken(token ?? undefined, secret)).toBe(true)
    expect(isMalaysiaRfqAttributionToken(token ?? undefined, `${secret}x`)).toBe(false)
    expect(createMalaysiaRfqAttributionToken('too-short')).toBeNull()
    expect(createMalaysiaRfqAttributionToken(undefined)).toBeNull()
  })

  it('accepts only the same-origin application hub Referer', () => {
    expect(isMalaysiaApplicationHubReferer('https://tio2malaysia.com/api/rfq/context', 'https://tio2malaysia.com/applications/')).toBe(true)
    expect(isMalaysiaApplicationHubReferer('https://tio2malaysia.com/api/rfq/context', 'https://tio2malaysia.com/applications')).toBe(true)
    expect(isMalaysiaApplicationHubReferer('https://tio2malaysia.com/api/rfq/context', 'https://evil.example/applications/')).toBe(false)
    expect(isMalaysiaApplicationHubReferer('https://tio2malaysia.com/api/rfq/context', 'https://tio2malaysia.com/products/')).toBe(false)
  })

  it.each([
    ['/', 'HOME-001'], ['/markets/', 'MARKET-000'], ['/products/m-350/', 'GRADE-M350'],
    ['/documents/tds-sds-coa/', 'DOC-TDS'], ['/resources/', 'RES-000'],
    ['/products/chloride-process-titanium-dioxide/', 'PRODUCT-PROC-CL'],
  ])('maps %s on the server and keeps the %s token opaque', (path, source) => {
    const requestUrl = 'https://tio2malaysia.com/api/rfq/context'
    expect(resolveMalaysiaRfqRefererSource(requestUrl, `https://tio2malaysia.com${path}`)).toBe(source)
    const token = createMalaysiaRfqAttributionToken(secret, source)
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/u)
    expect(token).not.toContain(source)
    expect(resolveMalaysiaRfqAttributionToken(token ?? undefined, secret)).toBe(source)
  })

  it('records attribution in an HttpOnly opaque cookie without exposing the source', async () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    const response = recordAttribution(new NextRequest('https://tio2malaysia.com/api/rfq/context', {
      method: 'POST', headers: {referer: 'https://tio2malaysia.com/applications/'},
    }))
    expect(response.status).toBe(204)
    const serialized = response.headers.get('set-cookie') ?? ''
    expect(serialized).toContain(`${MALAYSIA_RFQ_ATTRIBUTION_COOKIE}=`)
    expect(serialized).toMatch(/HttpOnly/iu)
    expect(serialized).toMatch(/SameSite=strict/iu)
    expect(`${serialized}\n${await response.text()}`).not.toContain('APP-000')
  })

  it('uses the forwarded browser host when the local runtime URL is normalized', () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    const response = recordAttribution(new NextRequest('http://localhost:4391/api/rfq/context', {
      method: 'POST',
      headers: {host: '127.0.0.1:4391', referer: 'http://127.0.0.1:4391/applications/'},
    }))
    expect(response.status).toBe(204)
  })

  it('does not record attribution for a foreign Referer', () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    const response = recordAttribution(new NextRequest('https://tio2malaysia.com/api/rfq/context', {
      method: 'POST', headers: {referer: 'https://evil.example/applications/'},
    }))
    expect(response.status).toBe(404)
    expect(response.headers.get('set-cookie')).toBeNull()
  })

  it('injects the private source only into the server-to-receiver payload', async () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '01234567-89ab-cdef-0123-456789abcdef')
    vi.stubEnv('TIO2_MY_WEB3FORMS_ENDPOINT', 'https://receiver.example/submit')
    let forwarded: Record<string, unknown> = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      forwarded = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Response.json({success: false})
    }))
    const token = createMalaysiaRfqAttributionToken(secret)
    const response = await submitRfq(new NextRequest('https://tio2malaysia.com/api/rfq/submit', {
      method: 'POST',
      headers: {'content-type': 'application/json', cookie: `${MALAYSIA_RFQ_ATTRIBUTION_COOKIE}=${token}`},
      body: JSON.stringify({...buyer, source_page_id: 'ATTACKER-VALUE', site_scope: 'ATTACKER-VALUE'}),
    }))
    expect(response.status).toBe(200)
    expect(forwarded).toMatchObject({...buyer, site_scope: 'tio2-my', page_id: 'CONV-RFQ', source_page_id: 'APP-000'})
    expect(`${response.headers.get('content-type')}\n${await response.text()}`).not.toContain('APP-000')
  })

  it('injects a shared consumer source only after validating its opaque token', async () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '01234567-89ab-cdef-0123-456789abcdef')
    let forwarded: Record<string, unknown> = {}
    vi.stubGlobal('fetch', vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      forwarded = JSON.parse(String(init?.body)) as Record<string, unknown>
      return Response.json({success: false})
    }))
    const token = createMalaysiaRfqAttributionToken(secret, 'HOME-001')
    const response = await submitRfq(new NextRequest('https://tio2malaysia.com/api/rfq/submit', {
      method: 'POST',
      headers: {'content-type': 'application/json', cookie: `${MALAYSIA_RFQ_ATTRIBUTION_COOKIE}=${token}`},
      body: JSON.stringify(buyer),
    }))
    expect(response.status).toBe(200)
    expect(forwarded.source_page_id).toBe('HOME-001')
    expect(await response.text()).not.toContain('HOME-001')
  })

  it('submits normally without adding a private source when no attribution cookie exists', async () => {
    vi.stubEnv('TIO2_MY_RFQ_ATTRIBUTION_SECRET', secret)
    vi.stubEnv('NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY', '01234567-89ab-cdef-0123-456789abcdef')
    const receiver = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
      const forwarded = JSON.parse(String(init?.body)) as Record<string, unknown>
      expect(forwarded).not.toHaveProperty('source_page_id')
      return Response.json({success: false})
    })
    vi.stubGlobal('fetch', receiver)
    const response = await submitRfq(new NextRequest('https://tio2malaysia.com/api/rfq/submit', {
      method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(buyer),
    }))
    expect(response.status).toBe(200)
    expect(receiver).toHaveBeenCalledOnce()
    expect(await response.json()).toEqual({kind: 'submission_unconfirmed'})
  })
})
