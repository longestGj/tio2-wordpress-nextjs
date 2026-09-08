import type {Metadata} from 'next'
import {Inter} from 'next/font/google'
import {SiteHeader} from '@/components/site-header'
import {getCurrentSite} from '@/lib/sites/current-site'
import globalChrome from '@/wordpress/plugins/tio2-site-model/config/tio2-my-global-chrome.json'

const site = getCurrentSite()
const brazilPtFont=Inter({subsets:['latin'],weight:['400','500','600','700'],display:'swap',variable:'--font-my-shared'})

export const metadata: Metadata = {
  title: site.defaultSeo.title,
  description: site.defaultSeo.description,
  metadataBase: new URL(site.url),
  icons: site.id === 'tio2-my'
    ? {icon: [{url: globalChrome.logo.favicon.src, type: 'image/svg+xml'}]}
    : undefined,
}

export default function MalaysiaBrazilPortugueseRootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="pt-BR">
    <body className={site.id === 'tio2-my' ? brazilPtFont.variable : undefined}>
      <SiteHeader site={site}/>
      {children}
    </body>
  </html>
}
