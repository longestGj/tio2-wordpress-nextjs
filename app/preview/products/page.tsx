import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {cache} from 'react'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {isValidatedProductExperiencePage, ProductPageContractError} from '@/lib/products/page-dto'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getProductPagePreview, ProductPagePreviewNotFoundError} from '@/lib/wordpress/product-page-preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

const PATH = '/products'
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const loadPage = cache(async () => {
  const site = getCurrentSite()
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || !(await hasScopedPreviewSession(site.id, PATH))) notFound()
  try {
    const page = await getProductPagePreview(site, PATH)
    if (!isValidatedProductExperiencePage(page) || page.level !== 'hub' || page.identity.path !== PATH) notFound()
    return page
  } catch (error) {
    if (error instanceof ProductPagePreviewNotFoundError || error instanceof ProductPageContractError || error instanceof CrossSiteContentError || error instanceof InvalidContentPathError) notFound()
    throw error
  }
})

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPage()
  return {title: page.seo.title, description: page.seo.description, robots: {index: false, follow: false}}
}

export default async function ProductHubPreviewPage() {
  return <ProductPageRenderer page={await loadPage()} />
}
