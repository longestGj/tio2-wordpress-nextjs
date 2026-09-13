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
export const CONSENT_VERSION = 'ga4-active-v1'

export interface MalaysiaConsentRecord {
  readonly site_scope: 'tio2-my'
  readonly consent_version: typeof CONSENT_VERSION
  readonly choice: ConsentChoice
  readonly decided_at: string
}

function isConsentChoice(value: unknown): value is ConsentChoice {
  return value === 'analytics_accepted' || value === 'necessary_only'
}

function isIsoDate(value: unknown): value is string {
  if (typeof value !== 'string') return false
  const parsed = new Date(value)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value
}

function parseConsentRecord(raw: string | null): MalaysiaConsentRecord | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    const keys = Object.keys(value).sort().join(',')
    return keys === 'choice,consent_version,decided_at,site_scope' &&
      value.site_scope === 'tio2-my' && value.consent_version === CONSENT_VERSION &&
      isConsentChoice(value.choice) && isIsoDate(value.decided_at)
      ? value as unknown as MalaysiaConsentRecord : null
  } catch {
    return null
  }
}

function parseLegacyChoice(raw: string | null): {choice: ConsentChoice; decidedAt?: number} | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as Record<string, unknown>
    if (value.version !== 1 || !isConsentChoice(value.choice)) return null
    return {choice: value.choice, ...(typeof value.decidedAt === 'number' ? {decidedAt: value.decidedAt} : {})}
  } catch { return null }
}

export function createMalaysiaConsentRecord(
  choice: ConsentChoice,
  decidedAt: Date = new Date(),
): MalaysiaConsentRecord {
  return {
    site_scope: 'tio2-my',
    consent_version: CONSENT_VERSION,
    choice,
    decided_at: decidedAt.toISOString(),
  }
}

export function persistMalaysiaConsentChoice(choice: ConsentChoice, decidedAt: Date = new Date()): void {
  window.localStorage.setItem(CONSENT_KEY, JSON.stringify(createMalaysiaConsentRecord(choice, decidedAt)))
  window.localStorage.removeItem(LEGACY_CONSENT_KEY)
}

export function readMalaysiaConsentChoice(): ConsentChoice {
  try {
    const currentRaw = window.localStorage.getItem(CONSENT_KEY)
    const current = parseConsentRecord(currentRaw)
    if (current) return current.choice
    const oldCanonical = parseLegacyChoice(currentRaw)
    if (oldCanonical) {
      const decidedAt = Number.isFinite(oldCanonical.decidedAt)
        ? new Date(oldCanonical.decidedAt!) : new Date()
      persistMalaysiaConsentChoice(oldCanonical.choice, decidedAt)
      return oldCanonical.choice
    }
    if (currentRaw !== null) return 'necessary_only'

    const legacy = parseLegacyChoice(window.localStorage.getItem(LEGACY_CONSENT_KEY))
    if (!legacy) return 'necessary_only'
    persistMalaysiaConsentChoice(legacy.choice)
    return legacy.choice
  } catch {return 'necessary_only'}
}

export function readEffectiveMalaysiaConsentChoice(analyticsActive: boolean): ConsentChoice {
  const choice = readMalaysiaConsentChoice()
  if (analyticsActive || choice === 'necessary_only') return choice
  try {
    persistMalaysiaConsentChoice('necessary_only')
  } catch {
    // The effective choice still fails closed when storage is unavailable.
  }
  return 'necessary_only'
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

