import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {MalaysiaThankYouPage} from '@/components/sites/tio2-my/thank-you/malaysia-thank-you-page'
import {buildMalaysiaThankYouJsonLd, serializeMalaysiaThankYouJsonLd} from '@/lib/seo/thank-you-jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'

export const dynamic = 'force-dynamic'

function requireMalaysiaSite() {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') notFound()
  return site
}

export function generateMetadata(): Metadata {
  requireMalaysiaSite()
  return {
    title: 'Thank You | TiO2 Malaysia',
    description: 'View confirmation and next steps for a TiO2 Malaysia quotation, document or sample request, or choose the request you would like to make.',
    alternates: {canonical: 'https://tio2malaysia.com/thank-you/'},
    robots: {index: false, follow: false},
  }
}

export default function ThankYouRoute() {
  requireMalaysiaSite()
  const jsonLd = serializeMalaysiaThankYouJsonLd(buildMalaysiaThankYouJsonLd())
  return <>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />
    <MalaysiaThankYouPage />
  </>
}

