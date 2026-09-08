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


export const CONSENT_KEY = 'tio2-my:consent:v1'
export function readMalaysiaConsentChoice(): ConsentChoice {
  try {
    const value = JSON.parse(window.localStorage.getItem(CONSENT_KEY) ?? 'null')
    return value?.version === 1 && value?.choice === 'analytics_accepted' ? 'analytics_accepted' : 'necessary_only'
  } catch {return 'necessary_only'}
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
}

