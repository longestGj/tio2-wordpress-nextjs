import type {Metadata} from 'next'

import {MalaysiaNotFoundPage} from '@/components/sites/tio2-my/system/malaysia-not-found-page'
import {getCurrentSite} from '@/lib/sites/current-site'

export function generateMetadata(): Metadata {
  const site = getCurrentSite()
  if (site.id !== 'tio2-my' || site.wordpressScope !== 'tio2-my') return {}
  return {title: 'Page Not Found | TiO2 Malaysia', robots: 'noindex, follow'}
}

export default function ContentNotFound() {
  const site = getCurrentSite()
  if (site.id === 'tio2-my' && site.wordpressScope === 'tio2-my') return <MalaysiaNotFoundPage />
  return <main><h1>404</h1><p>This page could not be found.</p></main>
}
