export type ConsentChoice = 'necessary_only' | 'analytics_accepted'
type GoogleConsentValue = 'denied' | 'granted'
export interface GoogleConsentSnapshot {
  readonly analytics_storage: GoogleConsentValue
  readonly ad_storage: 'denied'
  readonly ad_user_data: 'denied'
  readonly ad_personalization: 'denied'
}

export function createDeniedGoogleConsent(): GoogleConsentSnapshot {
  return {analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied'}
}

export function transitionConsent(choice: ConsentChoice): GoogleConsentSnapshot {
  return {...createDeniedGoogleConsent(), analytics_storage: choice === 'analytics_accepted' ? 'granted' : 'denied'}
}


import {readMalaysiaAnalyticsConfig} from '@/lib/analytics/malaysia-ga4'

export const CONSENT_KEY = 'tio2_my_consent_v1'
export const LEGACY_CONSENT_KEY = 'tio2-my:consent:v1'

function parseConsentChoice(raw: string | null): ConsentChoice | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value?.version === 1 &&
      (value.choice === 'analytics_accepted' || value.choice === 'necessary_only')
      ? value.choice
      : null
  } catch {
    return null
  }
}

export function readMalaysiaConsentChoice(): ConsentChoice {
  try {
    const current = parseConsentChoice(window.localStorage.getItem(CONSENT_KEY))
    if (current) return current

    const legacy = parseConsentChoice(window.localStorage.getItem(LEGACY_CONSENT_KEY))
    if (!legacy) return 'necessary_only'
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({version: 1, choice: legacy, decidedAt: Date.now()}))
    window.localStorage.removeItem(LEGACY_CONSENT_KEY)
    return legacy
  } catch {return 'necessary_only'}
}

export function removeMalaysiaAnalyticsCookies(measurementId?: string): void {
  if (typeof document === 'undefined') return
  const suffix = measurementId?.match(/^G-([A-Z0-9]{8,})$/u)?.[1]
  const names = ['_ga', ...(suffix ? [`_ga_${suffix}`] : [])]
  const hostname = window.location.hostname.toLowerCase()
  const domains = hostname === 'tio2malaysia.com' || hostname.endsWith('.tio2malaysia.com')
    ? ['', 'Domain=tio2malaysia.com; ', 'Domain=.tio2malaysia.com; ']
    : ['']
  for (const name of names) {
    for (const domain of domains) {
      document.cookie = `${name}=; ${domain}Path=/; Max-Age=0; SameSite=Lax`
    }
  }
}

export function applyMalaysiaConsent(choice: ConsentChoice, command: 'default' | 'update') {
  window.__TIO2_SHARED_CONSENT__ = {siteScope: 'tio2-my', analytics: choice === 'analytics_accepted' ? 'granted' : 'denied'}
  window.dataLayer ??= []
  // Consent commands contain only preference flags; no request or buyer fields.
  // Standard gtag queue format; no Google tag is installed by this preference control.
  // gtag consumes an Arguments entry, not a dataLayer event object.
  // eslint-disable-next-line prefer-rest-params, @typescript-eslint/no-unused-vars
  function queueConsent(_type: string, _command: string, _snapshot: GoogleConsentSnapshot) {window.dataLayer!.push(arguments as unknown as Record<string, unknown>)}
  queueConsent('consent', command, transitionConsent(choice))
  if (command === 'update' && choice === 'necessary_only') {
    removeMalaysiaAnalyticsCookies(readMalaysiaAnalyticsConfig()?.ga4MeasurementId)
  }
}

