import {afterEach, describe, expect, it, vi} from 'vitest'
import {NextRequest} from 'next/server'

import {POST} from '../../../app/api/contact/submit/route'

const valid = {
  full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
  country_region: 'Malaysia', subject: 'Partnership', message: 'General business inquiry.',
}

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

function request(body: unknown, headers: Record<string, string> = {'content-type': 'application/json'}) {
  return new NextRequest('https://tio2malaysia.com/api/contact/submit', {method: 'POST', headers, body: JSON.stringify(body)})
}

describe('CONTACT-001 fail-closed submit route', () => {
  it('repeats validation and rejects fields outside the exact six-field contract', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const invalid = await POST(request({...valid, message: ''}))
    expect(invalid.status).toBe(400)
    expect(await invalid.json()).toEqual({kind: 'validation_failed', errors: {message: 'Enter your message.'}})
    const extra = await POST(request({...valid, product_grade: 'M-350'}))
    expect(extra.status).toBe(400)
    expect(await extra.json()).toEqual({kind: 'submission_unconfirmed'})
  })

  it('keeps a valid submission unavailable without a Contact-specific processor decision', async () => {
    vi.stubEnv('SITE_ID', 'tio2-my')
    const outbound = vi.fn()
    vi.stubGlobal('fetch', outbound)
    const response = await POST(request(valid))
    expect(response.status).toBe(503)
    expect(response.headers.get('cache-control')).toBe('no-store')
    expect(await response.json()).toEqual({kind: 'submission_unconfirmed'})
    expect(outbound).not.toHaveBeenCalled()
  })

  it('rejects another site scope before reading the payload', async () => {
    vi.stubEnv('SITE_ID', 'tio2-b')
    const response = await POST(request(valid))
    expect(response.status).toBe(404)
  })
})
