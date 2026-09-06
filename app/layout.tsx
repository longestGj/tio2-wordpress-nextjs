import type {Metadata} from 'next'
import {headers} from 'next/headers'
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

const TIO2_MY_DOCUMENT_LANGUAGE_HEADER = 'x-tio2-my-document-language'

export default async function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  const requestLanguage = site.id === 'tio2-my'
    ? (await headers()).get(TIO2_MY_DOCUMENT_LANGUAGE_HEADER)
    : null
  const documentLanguage = requestLanguage === 'ms-MY' || requestLanguage === site.locale
    ? requestLanguage
    : site.locale

  return (
    <html lang={documentLanguage}>
      <body>
        <SiteHeader site={site} />
        {children}
      </body>
    </html>
  )
}
