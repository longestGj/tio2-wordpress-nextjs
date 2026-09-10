import {describe, expect, it, vi} from 'vitest'

import {submitMalaysiaContact} from '@/lib/contact/malaysia-contact-receiver'

const values = {
  full_name: 'Amina Tan', company: 'Example Co', business_email: 'amina@example.com',
  country_region: 'Malaysia', subject: 'Partnership', message: 'General business inquiry.',
}
const options = {accessKey: '01234567-89ab-cdef-0123-456789abcdef', requestToken: 'contact-token'}

describe('CONTACT-001 Web3Forms receiver boundary', () => {
  it('uses the shared fixed browser endpoint and Contact-scoped payload', async () => {
    const fetcher = vi.fn(async () => Response.json({success: true}))
    await expect(submitMalaysiaContact(values, {...options, fetcher})).resolves.toMatchObject({kind: 'provider_accepted'})
    const [endpoint, init] = (fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>)[0]!
    expect(String(endpoint)).toBe('https://api.web3forms.com/submit')
    const payload = JSON.parse(String(init.body)) as Record<string, unknown>
    expect(payload).toMatchObject({
      access_key: options.accessKey, email: 'amina@example.com', inquiry_subject: 'Partnership',
      subject: 'TiO2 Malaysia general inquiry', site_scope: 'tio2-my', page_id: 'CONTACT-001',
      workflow_type: 'contact', locale: 'en', request_token: 'contact-token',
    })
    expect(payload).not.toHaveProperty('recipient')
    expect(payload).not.toHaveProperty('to')
  })

  it('fails before dispatch for missing configuration or invalid values', async () => {
    const fetcher = vi.fn()
    await expect(submitMalaysiaContact(values, {...options, accessKey: null, fetcher})).resolves.toMatchObject({kind: 'unavailable'})
    await expect(submitMalaysiaContact({...values, message: ''}, {...options, fetcher})).resolves.toMatchObject({kind: 'validation_failed'})
    expect(fetcher).not.toHaveBeenCalled()
  })

  it.each([
    [200, 'application/json', {success: false}],
    [202, 'application/json', {success: true}],
    [500, 'application/json', {success: true}],
    [200, 'text/plain', {success: true}],
  ])('accepts only HTTP 200 JSON success=true %#', async (status, contentType, body) => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify(body), {status, headers: {'content-type': contentType}}))
    await expect(submitMalaysiaContact(values, {...options, fetcher}))
      .resolves.toMatchObject({kind: expect.not.stringMatching('provider_accepted')})
    expect(fetcher).toHaveBeenCalledOnce()
  })

  it('marks local prerelease synthetic submissions without exposing a recipient field', async () => {
    const fetcher = vi.fn(async () => Response.json({success: true}))
    await submitMalaysiaContact(values, {...options, environment: 'local-prerelease', fetcher})
    const body = JSON.parse(String((fetcher.mock.calls as unknown as Array<[RequestInfo | URL, RequestInit]>)[0]?.[1]?.body)) as Record<string, unknown>
    expect(body).toMatchObject({environment: 'local-prerelease', test_run_id: 'contact-token', subject: '[LOCAL PRERELEASE] TiO2 Malaysia general inquiry — TEST contact-token'})
    expect(body).not.toHaveProperty('recipient')
  })
})
