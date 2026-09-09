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
})
