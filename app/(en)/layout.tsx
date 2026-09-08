import type {Metadata} from 'next'
import {SiteHeader} from '@/components/site-header'
import {getCurrentSite} from '@/lib/sites/current-site'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

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
      <body>
        <SiteHeader site={site} />
        {children}
      </body>
    </html>
  )
}
