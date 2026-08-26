import type {Metadata} from 'next'
import {SiteHeader} from '@/components/site-header'
import {getCurrentSite} from '@/lib/sites/current-site'

const site = getCurrentSite()

export const metadata: Metadata = {
  title: site.defaultSeo.title,
  description: site.defaultSeo.description,
  metadataBase: new URL(site.url),
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
