// @vitest-environment jsdom

import {afterEach, describe, expect, it} from 'vitest'

import {emitMalaysiaRfqAnalyticsEvent} from '@/lib/rfq/malaysia-rfq-analytics'

afterEach(() => {
  delete window.__TIO2_SHARED_CONSENT__
  delete window.dataLayer
})

describe('CONV-RFQ consent-gated analytics', () => {
  it('emits only fixed privacy-safe fields after same-scope analytics consent', () => {
    window.__TIO2_SHARED_CONSENT__ = {siteScope: 'tio2-my', analytics: 'granted'}
    expect(emitMalaysiaRfqAnalyticsEvent('rfq_receipt_confirmed')).toBe(true)
    expect(window.dataLayer).toEqual([{
      event: 'rfq_receipt_confirmed', site_scope: 'tio2-my', page_id: 'CONV-RFQ',
    }])
  })

  it('does nothing for missing, denied or foreign-scope consent', () => {
    expect(emitMalaysiaRfqAnalyticsEvent('rfq_submission_started')).toBe(false)
    window.__TIO2_SHARED_CONSENT__ = {siteScope: 'tio2-my', analytics: 'denied'}
    expect(emitMalaysiaRfqAnalyticsEvent('rfq_submission_started')).toBe(false)
    window.__TIO2_SHARED_CONSENT__ = {siteScope: 'tio2-a', analytics: 'granted'}
    expect(emitMalaysiaRfqAnalyticsEvent('rfq_submission_started')).toBe(false)
    expect(window.dataLayer).toBeUndefined()
  })
})
