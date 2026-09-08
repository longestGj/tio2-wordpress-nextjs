// @vitest-environment jsdom
import {beforeEach, expect, it} from 'vitest'
import * as session from '@/lib/thank-you/malaysia-thank-you-session'
beforeEach(() => {localStorage.clear(); sessionStorage.clear(); delete window.__TIO2_SHARED_CONSENT__; window.dataLayer = []})
it('emits distinct acknowledged source conversions only when consent is granted, with no buyer fields', () => {
  expect(typeof session.emitMalaysiaSourceSuccess).toBe('function')
  localStorage.setItem('tio2-my:consent:v1', JSON.stringify({version:1,choice:'analytics_accepted'}))
  for (const request of ['quote','documents','sample'] as const) session.emitMalaysiaSourceSuccess(request)
  expect(window.dataLayer).toEqual([
    {event:'rfq_receipt_confirmed',ad_personalization:'denied'},
    {event:'documents_receipt_confirmed',ad_personalization:'denied'},
    {event:'sample_receipt_confirmed',ad_personalization:'denied'},
  ])
  localStorage.setItem('tio2-my:consent:v1', JSON.stringify({version:1,choice:'necessary_only'}))
  session.emitMalaysiaSourceSuccess('quote')
  expect(window.dataLayer).toHaveLength(3)
})

it('honors current withdrawal even if an earlier persisted acceptance remains', () => {
  localStorage.setItem('tio2-my:consent:v1', JSON.stringify({version:1,choice:'analytics_accepted'}))
  window.__TIO2_SHARED_CONSENT__ = {siteScope:'tio2-my',analytics:'denied'}
  session.emitMalaysiaSourceSuccess('quote')
  expect(window.dataLayer).toEqual([])
})
