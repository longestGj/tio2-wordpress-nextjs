// @vitest-environment jsdom

import {afterAll, beforeAll, describe, expect, it} from 'vitest'

import {
  type AuditCookieStore,
  installBrowserSideEffectAudit,
} from '@/tests/utils/browser-side-effect-audit'

beforeAll(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.cookie = 'audit-cookie=; Max-Age=0; Path=/'
})

afterAll(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.cookie = 'audit-cookie=; Max-Age=0; Path=/'
  document.cookie = 'baseline-cookie=; Max-Age=0; Path=/'
})

describe('installBrowserSideEffectAudit', () => {
  it('observes reads, method writes, named-property writes, cookies, and Cookie Store calls', async () => {
    localStorage.setItem('baseline-local', 'kept')
    sessionStorage.setItem('baseline-session', 'kept')
    document.cookie = 'baseline-cookie=kept; Path=/'
    const originalCookieStore = Object.getOwnPropertyDescriptor(globalThis, 'cookieStore')
    const audit = installBrowserSideEffectAudit()

    localStorage.getItem('missing')
    localStorage.setItem('method', 'value')
    localStorage.named = 'property'
    void localStorage.named
    void localStorage.length
    localStorage.key(0)
    localStorage.removeItem('method')
    sessionStorage.setItem('session-method', 'value')
    sessionStorage.named = 'session-property'
    void sessionStorage.named
    void sessionStorage.length
    sessionStorage.key(0)
    sessionStorage.clear()
    void document.cookie
    document.cookie = 'audit-cookie=value; Path=/'
    const cookieStore = (globalThis as {cookieStore: AuditCookieStore}).cookieStore
    await cookieStore.get('audit-cookie')
    await cookieStore.set('audit-cookie', 'value')
    await cookieStore.delete('audit-cookie')

    const result = audit.finish()

    expect(result.calls).toMatchObject({
      localStorage: {
        getItem: 1,
        key: 1,
        length: 1,
        namedRead: 1,
        setItem: 1,
        removeItem: 1,
        clear: 0,
        namedWrite: 1,
      },
      sessionStorage: {
        getItem: 0,
        key: 1,
        length: 1,
        namedRead: 1,
        setItem: 1,
        removeItem: 0,
        clear: 1,
        namedWrite: 1,
      },
      documentCookie: {get: 1, set: 1},
      cookieStore: {get: 1, set: 1, delete: 1},
    })
    expect(result.observed.localStorage).not.toEqual(result.initial.localStorage)
    expect(result.observed.sessionStorage).not.toEqual(result.initial.sessionStorage)
    expect(result.observed.documentCookie).not.toEqual(result.initial.documentCookie)
    expect(result.final).toEqual(result.initial)
    expect(Object.getOwnPropertyDescriptor(globalThis, 'cookieStore')).toEqual(
      originalCookieStore,
    )
  })

  it('starts the next test without storage, cookie, or Cookie Store residue', () => {
    expect(Object.fromEntries(Object.entries(localStorage))).toEqual({
      'baseline-local': 'kept',
    })
    expect(Object.fromEntries(Object.entries(sessionStorage))).toEqual({
      'baseline-session': 'kept',
    })
    expect(document.cookie).toContain('baseline-cookie=kept')
    expect(document.cookie).not.toContain('audit-cookie=')
    expect(Object.prototype.hasOwnProperty.call(globalThis, 'cookieStore')).toBe(false)

    const audit = installBrowserSideEffectAudit()
    const result = audit.finish()
    expect(result.final).toEqual(result.initial)
  })
})
