export type MalaysiaRfqAnalyticsEvent =
  | 'rfq_validation_failed'
  | 'rfq_submission_started'
  | 'rfq_submission_unconfirmed'
  | 'rfq_receipt_confirmed'

declare global {
  interface Window {
    __TIO2_SHARED_CONSENT__?: {
      readonly siteScope?: string
      readonly analytics?: 'granted' | 'denied' | 'unknown'
    }
    dataLayer?: Array<Record<string, unknown>>
  }
}

export function emitMalaysiaRfqAnalyticsEvent(event: MalaysiaRfqAnalyticsEvent): boolean {
  if (typeof window === 'undefined') return false
  const consent = window.__TIO2_SHARED_CONSENT__
  if (consent?.siteScope !== 'tio2-my' || consent.analytics !== 'granted') return false
  window.dataLayer ??= []
  window.dataLayer.push({event, site_scope: 'tio2-my', page_id: 'CONV-RFQ'})
  return true
}
