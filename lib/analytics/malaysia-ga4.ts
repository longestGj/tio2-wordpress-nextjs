export const MALAYSIA_GTM_ENV = 'NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID'
export const MALAYSIA_GA4_ENV = 'NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID'

export interface MalaysiaAnalyticsEnvironment {
  readonly [key: string]: string | undefined
  readonly NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID?: string
  readonly NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID?: string
}

export interface MalaysiaAnalyticsConfig {
  readonly siteScope: 'tio2-my'
  readonly gtmContainerId: string
  readonly ga4MeasurementId: string
}

const GTM_ID = /^GTM-[A-Z0-9]{6,}$/u
const GA4_ID = /^G-[A-Z0-9]{8,}$/u

export const MALAYSIA_PUBLIC_ANALYTICS_ENV: MalaysiaAnalyticsEnvironment = {
  NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: process.env.NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID,
  NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: process.env.NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID,
}

export function readMalaysiaAnalyticsConfig(
  env: MalaysiaAnalyticsEnvironment = MALAYSIA_PUBLIC_ANALYTICS_ENV,
): MalaysiaAnalyticsConfig | null {
  const gtmContainerId = env[MALAYSIA_GTM_ENV]?.trim().toUpperCase() ?? ''
  const ga4MeasurementId = env[MALAYSIA_GA4_ENV]?.trim().toUpperCase() ?? ''
  if (!GTM_ID.test(gtmContainerId) || !GA4_ID.test(ga4MeasurementId)) return null
  return {siteScope: 'tio2-my', gtmContainerId, ga4MeasurementId}
}

export function getMalaysiaGa4PropertyCookieName(measurementId: string): string | null {
  const match = measurementId.trim().toUpperCase().match(/^G-([A-Z0-9]{8,})$/u)
  return match ? `_ga_${match[1]}` : null
}

export function buildMalaysiaGtmBootstrap(config: MalaysiaAnalyticsConfig): string {
  return [
    'window.dataLayer=window.dataLayer||[];',
    "function gtag(){dataLayer.push(arguments);}",
    "gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});",
    `dataLayer.push({site_scope:'tio2-my',tio2_my_ga4_measurement_id:'${config.ga4MeasurementId}'});`,
    "dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});",
  ].join('')
}
