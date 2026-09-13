import {
  MALAYSIA_PUBLIC_ANALYTICS_ENV,
  readMalaysiaAnalyticsConfig,
  type MalaysiaAnalyticsEnvironment,
} from '@/lib/analytics/malaysia-ga4'
import approvedLegalPages from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const common = {
  close: 'Close',
  accept: 'Accept analytics',
  cookiePolicy: 'Read Cookie Policy',
  cookiePolicyHref: '/cookie-policy/',
} as const

export function getMalaysiaConsentCopy(
  env: MalaysiaAnalyticsEnvironment = MALAYSIA_PUBLIC_ANALYTICS_ENV,
  legalAnalyticsAuthorized = approvedLegalPages.releaseControls.optionalAnalyticsAuthorized,
) {
  if (legalAnalyticsAuthorized && readMalaysiaAnalyticsConfig(env)) {
    return {
      ...common,
      analyticsActive: true,
      title: 'Analytics preferences',
      body: 'Optional Analytics helps us understand aggregate website use and performance. If you choose Necessary only, Analytics storage remains off, but limited cookieless measurement signals may still be sent to Google.',
      necessary: 'Necessary only',
      necessaryDetail: "Necessary — Always active. Supports site operation and remembers this site's privacy choice.",
      analyticsDetail: 'Analytics — Off by default. Allows Google Analytics storage for aggregate measurement after you accept it. Advertising storage, advertising user data and advertising personalisation remain off.',
    } as const
  }

  return {
    ...common,
    analyticsActive: false,
    title: 'Cookie settings',
    body: 'No optional Analytics or advertising technology is currently active on this site. Necessary functions may use browser storage to operate the site and remember an available privacy setting.',
    necessary: 'Reject / withdraw analytics',
    necessaryDetail: 'Necessary functions remain active.',
    analyticsDetail: 'Optional Analytics is not active in this runtime.',
  } as const
}
