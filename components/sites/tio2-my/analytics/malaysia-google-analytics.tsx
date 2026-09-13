/* eslint-disable @next/next/no-before-interactive-script-outside-document -- mounted only by App Router root layouts */
import Script from 'next/script'

import {
  buildMalaysiaGtmBootstrap,
  readMalaysiaAnalyticsConfig,
  type MalaysiaAnalyticsEnvironment,
} from '@/lib/analytics/malaysia-ga4'
import approvedLegalPages from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

export function MalaysiaGoogleAnalytics({
  siteId,
  env = process.env,
  legalAnalyticsAuthorized = approvedLegalPages.releaseControls.optionalAnalyticsAuthorized,
}: {
  readonly siteId: string
  readonly env?: MalaysiaAnalyticsEnvironment
  readonly legalAnalyticsAuthorized?: boolean
}) {
  if (siteId !== 'tio2-my') return null
  if (!legalAnalyticsAuthorized) return null
  const config = readMalaysiaAnalyticsConfig(env)
  if (!config) return null

  return (
    <>
      <Script
        id="tio2-my-gtm-bootstrap"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{__html: buildMalaysiaGtmBootstrap(config)}}
      />
      <Script
        id="tio2-my-gtm-loader"
        strategy="beforeInteractive"
        src={`https://www.googletagmanager.com/gtm.js?id=${config.gtmContainerId}`}
      />
    </>
  )
}
