import type {Metadata} from 'next'
import {SiteHeader} from '@/components/site-header'
import {getCurrentSite} from '@/lib/sites/current-site'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'
import {malaysiaSharedFont} from '@/lib/sites/malaysia-shared-font'
import {MalaysiaGoogleAnalytics} from '@/components/sites/tio2-my/analytics/malaysia-google-analytics'

const site = getCurrentSite()

export const metadata: Metadata = {
  title: site.defaultSeo.title,
  description: site.defaultSeo.description,
  metadataBase: new URL(site.url),
  icons: site.id === 'tio2-my'
    ? {icon: [{url: globalChrome.logo.favicon.src, type: 'image/svg+xml'}]}
    : undefined,
}

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return (
    <html lang={site.locale}>
      <head>
        <MalaysiaGoogleAnalytics siteId={site.id} />
      </head>
      <body
        className={site.id === 'tio2-my' ? malaysiaSharedFont.variable : undefined}
        style={site.id === 'tio2-my' ? {margin: 0} : undefined}
      >
        <SiteHeader site={site} />
        {children}
      </body>
    </html>
  )
}
