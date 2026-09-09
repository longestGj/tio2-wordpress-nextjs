import {describe, expect, it} from 'vitest'
import {buyerEmailTestValue, providerAttempt} from '../e2e/support/prerelease-live-evidence'

describe('sanitized live prerelease harness', () => {
  it('uses a controlled synthetic BuyerEmail/Reply-To value scoped by run and workflow', () => {
    expect(buyerEmailTestValue('run-1', 'rfq')).toBe('local-prerelease-run-1-rfq@example.com')
    expect(() => buyerEmailTestValue('foreign@value', 'rfq')).toThrow('Invalid run identity')
  })
  it('records only a validated outbound token and provider category, never payload or response fields', () => {
    const attempt = providerAttempt('rfq', {request_token: '00000000-0000-4000-8000-000000000001', access_key: 'private', email: 'secret@owned.net', company: 'Secret', message: 'Private'}, 200, {success: true, message: 'private'})
    expect(attempt).toMatchObject({workflow: 'rfq', pageId: 'CONV-RFQ', requestToken: '00000000-0000-4000-8000-000000000001', httpStatus: 200, providerCategory: 'accepted', thankYouRequest: null})
    expect(JSON.stringify(attempt)).not.toMatch(/access_key|@|company|message|private|secret/i)
    expect(providerAttempt('sample', {request_token: attempt.requestToken}, 200, {success: false}).providerCategory).toBe('rejected')
    expect(providerAttempt('documents', {request_token: attempt.requestToken}, 429, {success: true}).providerCategory).toBe('rate_limited')
    expect(() => providerAttempt('rfq', {request_token: 'secret@owned.net'}, 200, {success: true})).toThrow('Invalid request token')
  })
  it.each([
    ['Invalid access key: PRIVATE_SENTINEL', 'invalid_access_key'],
    ['Domain is restricted: PRIVATE_SENTINEL', 'domain_or_origin_restricted'],
    ['Invalid email: PRIVATE_SENTINEL@example.test', 'invalid_email'],
    ['Invalid request payload: PRIVATE_SENTINEL', 'malformed_request'],
    ['Submission blocked by policy: PRIVATE_SENTINEL', 'provider_policy'],
    ['PRIVATE_SENTINEL', 'unknown_invalid_request'],
  ])('normalizes transient error messages before evidence capture %#', (message, category) => {
    const attempt = providerAttempt('rfq', {request_token: '00000000-0000-4000-8000-000000000001', email: 'PRIVATE_SENTINEL@example.test'}, 400, {success: false, body: {data: {message: 'Invalid access key'}, message}})
    expect(attempt.providerCategory).toBe(category)
    expect(Object.keys(attempt).sort()).toEqual(['httpStatus', 'pageId', 'providerCategory', 'requestToken', 'thankYouRequest', 'timestamp', 'workflow'])
    expect(JSON.stringify(attempt)).not.toMatch(/PRIVATE_SENTINEL|@|message|payload|body|"access_key"/u)
  })
  it('does not classify echoed buyer fields as provider messages', () => {
    const attempt = providerAttempt('documents', {request_token: '00000000-0000-4000-8000-000000000001'}, 422, {success: false, body: {data: {message: 'Invalid access key'}}})
    expect(attempt.providerCategory).toBe('unknown_invalid_request')
  })
})
