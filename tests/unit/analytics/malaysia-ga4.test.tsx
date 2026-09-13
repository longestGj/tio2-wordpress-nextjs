import {Children, isValidElement, type ReactElement, type ReactNode} from 'react'
import {describe, expect, it} from 'vitest'

import {MalaysiaGoogleAnalytics} from '@/components/sites/tio2-my/analytics/malaysia-google-analytics'
import {
  buildMalaysiaGtmBootstrap,
  getMalaysiaGa4PropertyCookieName,
  readMalaysiaAnalyticsConfig,
} from '@/lib/analytics/malaysia-ga4'

const validEnv = {
  NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: 'GTM-ABC1234',
  NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'G-1A2B3C4D5E',
}

describe('TiO2 Malaysia GTM-only GA4 delivery', () => {
  it('requires both valid, site-specific public identifiers', () => {
    expect(readMalaysiaAnalyticsConfig(validEnv)).toEqual({
      siteScope: 'tio2-my',
      gtmContainerId: 'GTM-ABC1234',
      ga4MeasurementId: 'G-1A2B3C4D5E',
    })
    expect(readMalaysiaAnalyticsConfig({...validEnv, NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID: ''})).toBeNull()
    expect(readMalaysiaAnalyticsConfig({...validEnv, NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID: 'UA-123'})).toBeNull()
    expect(getMalaysiaGa4PropertyCookieName('G-1A2B3C4D5E')).toBe('_ga_1A2B3C4D5E')
  })

  it('queues all denied defaults and site scope before GTM without direct GA4 config', () => {
    const bootstrap = buildMalaysiaGtmBootstrap(readMalaysiaAnalyticsConfig(validEnv)!)
    const defaultsAt = bootstrap.indexOf("gtag('consent','default'")
    const scopeAt = bootstrap.indexOf("site_scope:'tio2-my'")

    expect(defaultsAt).toBeGreaterThan(-1)
    expect(scopeAt).toBeGreaterThan(defaultsAt)
    for (const key of ['analytics_storage', 'ad_storage', 'ad_user_data', 'ad_personalization']) {
      expect(bootstrap).toContain(`${key}:'denied'`)
    }
    expect(bootstrap).toContain("tio2_my_ga4_measurement_id:'G-1A2B3C4D5E'")
    expect(bootstrap).not.toContain("gtag('config'")
    expect(bootstrap).not.toContain('email')
  })

  it('renders bootstrap before the single GTM loader only for tio2-my', () => {
    const result = MalaysiaGoogleAnalytics({
      siteId: 'tio2-my',
      env: validEnv,
      legalAnalyticsAuthorized: true,
    })
    expect(isValidElement(result)).toBe(true)
    const scripts = Children.toArray((result as ReactElement<{children: ReactNode}>).props.children)
      .filter((value): value is ReactElement<{id: string; src?: string}> => isValidElement(value))
    expect(scripts.map((script) => script.props.id)).toEqual([
      'tio2-my-gtm-bootstrap',
      'tio2-my-gtm-loader',
    ])
    expect(scripts[1]?.props.src).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-ABC1234')
    expect(MalaysiaGoogleAnalytics({siteId: 'tio2-a', env: validEnv})).toBeNull()
    expect(MalaysiaGoogleAnalytics({siteId: 'tio2-my', env: {}})).toBeNull()
    expect(MalaysiaGoogleAnalytics({siteId: 'tio2-my', env: validEnv})).toBeNull()
  })
})
