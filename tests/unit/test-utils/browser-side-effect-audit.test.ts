// @vitest-environment jsdom

import {afterEach, describe, expect, it} from 'vitest'

import {
  type AuditCookieStore,
  installBrowserSideEffectAudit,
} from '@/tests/utils/browser-side-effect-audit'

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  document.cookie = 'audit-cookie=; Max-Age=0; Path=/'
})

describe('installBrowserSideEffectAudit', () => {
  it('observes reads, method writes, named-property writes, cookies, and Cookie Store calls', async () => {
    const audit = installBrowserSideEffectAudit()

    localStorage.getItem('missing')
    localStorage.setItem('method', 'value')
    localStorage.named = 'property'
    localStorage.removeItem('method')
    sessionStorage.clear()
    void document.cookie
    document.cookie = 'audit-cookie=value; Path=/'
    const cookieStore = (globalThis as {cookieStore: AuditCookieStore}).cookieStore
    await cookieStore.get('audit-cookie')
    await cookieStore.set('audit-cookie', 'value')
    await cookieStore.delete('audit-cookie')

    const result = audit.finish()

    expect(result.calls).toMatchObject({
      localStorage: {getItem: 1, setItem: 1, removeItem: 1, clear: 0, namedWrite: 1},
      sessionStorage: {getItem: 0, setItem: 0, removeItem: 0, clear: 1, namedWrite: 0},
      documentCookie: {get: 1, set: 1},
      cookieStore: {get: 1, set: 1, delete: 1},
    })
    expect(result.final.localStorage).not.toEqual(result.initial.localStorage)
    expect(result.final.documentCookie).not.toEqual(result.initial.documentCookie)
  })
})
