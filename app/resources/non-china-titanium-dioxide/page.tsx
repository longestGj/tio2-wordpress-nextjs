import {notFound} from 'next/navigation'

import {MalaysiaResourceOriginPage} from '@/components/sites/tio2-my/resources/malaysia-resource-origin-page'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaResourceOrigin} from '@/lib/wordpress/resource-origin-v01-queries'
import {loadMalaysiaResourcePageRequest} from '@/lib/wordpress/resource-page-registry'

const PATH = '/resources/non-china-titanium-dioxide/'

export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  const page = await loadMalaysiaResourcePageRequest(
    site.id,
    site.wordpressScope,
    PATH,
    () => getMalaysiaResourceOrigin(),
  )
  if (!page) notFound()
  return {page, site}
}

export default async function MalaysiaResourceOriginRoute() {
  const {page} = await loadPage()
  return <MalaysiaResourceOriginPage page={page} />
}
