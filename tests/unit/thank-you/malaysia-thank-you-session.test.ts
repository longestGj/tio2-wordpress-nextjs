// @vitest-environment jsdom

import {beforeEach, describe, expect, it} from 'vitest'

import {
  MALAYSIA_THANK_YOU_MARKER_TTL_MS,
  recordMalaysiaThankYouReceipt,
  resolveMalaysiaThankYouRequest,
} from '@/lib/thank-you/malaysia-thank-you-session'

const now = 1_800_000_000_000

describe('CONV-THANK same-session receipt resolver', () => {
  beforeEach(() => sessionStorage.clear())

  it.each(['quote', 'documents', 'sample'] as const)('resolves a matching fresh %s receipt', (request) => {
    recordMalaysiaThankYouReceipt(request, {storage: sessionStorage, now})
    expect(resolveMalaysiaThankYouRequest(`?request=${request}`, {storage: sessionStorage, now: now + 1_000})).toBe(request)
  })

  it.each([
    ['', 'missing query'],
    ['?request=other', 'unsupported query'],
    ['?request=quote', 'markerless query'],
    ['?type=quote', 'legacy selector'],
    ['?type=quote&request=quote', 'legacy selector beside request'],
  ])('fails closed for %s (%s)', (search) => {
    expect(resolveMalaysiaThankYouRequest(search, {storage: sessionStorage, now})).toBe('direct')
  })

  it('fails closed for mismatched, stale, malformed and previous-session markers', () => {
    recordMalaysiaThankYouReceipt('documents', {storage: sessionStorage, now})
    expect(resolveMalaysiaThankYouRequest('?request=quote', {storage: sessionStorage, now})).toBe('direct')
    expect(resolveMalaysiaThankYouRequest('?request=documents', {storage: sessionStorage, now: now + MALAYSIA_THANK_YOU_MARKER_TTL_MS + 1})).toBe('direct')
    sessionStorage.setItem('tio2-my:thank-you:receipt:v1', '{bad json')
    expect(resolveMalaysiaThankYouRequest('?request=documents', {storage: sessionStorage, now})).toBe('direct')
    expect(resolveMalaysiaThankYouRequest('?request=documents', {storage: new MemoryStorage(), now})).toBe('direct')
  })

  it('does not let extra query keys grant, upgrade or renew a receipt', () => {
    recordMalaysiaThankYouReceipt('quote', {storage: sessionStorage, now})
    expect(resolveMalaysiaThankYouRequest('?request=sample&email=buyer@example.com', {storage: sessionStorage, now: now + 10})).toBe('direct')
    expect(resolveMalaysiaThankYouRequest('?request=quote&email=buyer@example.com', {storage: sessionStorage, now: now + 10})).toBe('quote')
    expect(resolveMalaysiaThankYouRequest('?request=quote', {storage: sessionStorage, now: now + MALAYSIA_THANK_YOU_MARKER_TTL_MS + 1})).toBe('direct')
  })

  it('stores only allowlisted non-personal marker fields', () => {
    recordMalaysiaThankYouReceipt('sample', {storage: sessionStorage, now, flowId: 'flow-123'})
    expect(JSON.parse(sessionStorage.getItem('tio2-my:thank-you:receipt:v1') ?? '{}')).toEqual({
      version: 1,
      request: 'sample',
      succeededAt: now,
      flowId: 'flow-123',
    })
  })

  it('fails to Direct when browser storage is unavailable', () => {
    const blocked = new MemoryStorage()
    blocked.getItem = () => { throw new DOMException('blocked', 'SecurityError') }
    expect(resolveMalaysiaThankYouRequest('?request=quote', {storage: blocked, now})).toBe('direct')
  })
})

class MemoryStorage implements Storage {
  readonly #values = new Map<string, string>()
  get length() { return this.#values.size }
  clear() { this.#values.clear() }
  getItem(key: string) { return this.#values.get(key) ?? null }
  key(index: number) { return [...this.#values.keys()][index] ?? null }
  removeItem(key: string) { this.#values.delete(key) }
  setItem(key: string, value: string) { this.#values.set(key, value) }
}
