// @vitest-environment jsdom
import {beforeEach, expect, it} from 'vitest'
import * as session from '@/lib/thank-you/malaysia-thank-you-session'
import {CONSENT_KEY} from '@/lib/consent/malaysia-consent'
beforeEach(() => {localStorage.clear(); sessionStorage.clear(); delete window.__TIO2_SHARED_CONSENT__; window.dataLayer = []})
it('emits distinct acknowledged source conversions only when consent is granted, with no buyer fields', () => {
  expect(typeof session.emitMalaysiaSourceSuccess).toBe('function')
  localStorage.setItem(CONSENT_KEY, JSON.stringify({version:1,choice:'analytics_accepted'}))
  for (const request of ['quote','documents','sample'] as const) session.emitMalaysiaSourceSuccess(request)
  expect(window.dataLayer).toEqual([
    {event:'rfq_provider_accepted',site_scope:'tio2-my',page_id:'CONV-RFQ',source:'web3forms',form_type:'quote'},
    {event:'documents_provider_accepted',site_scope:'tio2-my',page_id:'CONV-DOC',source:'web3forms',form_type:'documents'},
    {event:'sample_provider_accepted',site_scope:'tio2-my',page_id:'CONV-SAMPLE',source:'web3forms',form_type:'sample'},
  ])
  localStorage.setItem(CONSENT_KEY, JSON.stringify({version:1,choice:'necessary_only'}))
  session.emitMalaysiaSourceSuccess('quote')
  expect(window.dataLayer).toHaveLength(3)
})

it('honors current withdrawal even if an earlier persisted acceptance remains', () => {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({version:1,choice:'analytics_accepted'}))
  window.__TIO2_SHARED_CONSENT__ = {siteScope:'tio2-my',analytics:'denied'}
  session.emitMalaysiaSourceSuccess('quote')
  expect(window.dataLayer).toEqual([])
})

it('keeps buyer and URL values out of every conversion event', () => {
  localStorage.setItem(CONSENT_KEY, JSON.stringify({version:1,choice:'analytics_accepted'}))
  session.emitMalaysiaSourceSuccess('quote')
  const payload = JSON.stringify(window.dataLayer)
  for (const forbidden of ['buyer@example.com', '+60', 'Acme', 'message', 'filename', 'document_selection', '?request=']) {
    expect(payload).not.toContain(forbidden)
  }
  expect(Object.keys(window.dataLayer![0]!)).toEqual(['event', 'site_scope', 'page_id', 'source', 'form_type'])
})
