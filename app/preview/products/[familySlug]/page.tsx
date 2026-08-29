import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {cache} from 'react'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {isValidatedProductExperiencePage, ProductPageContractError} from '@/lib/products/page-dto'
import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getProductPagePreview, ProductPagePreviewNotFoundError} from '@/lib/wordpress/product-page-preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {CrossSiteContentError, InvalidContentPathError} from '@/lib/wordpress/types'

interface Props {readonly params: Promise<{readonly familySlug: string}>}
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const loadPage = cache(async (familySlug: string) => {
  const site = getCurrentSite()
  const identity = resolveProductPageIdentity(`/products/${familySlug}`)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'family' || identity.familySlug !== familySlug || !(await hasScopedPreviewSession(site.id, identity.path))) notFound()
  try {
    const page = await getProductPagePreview(site, identity.path)
    if (!isValidatedProductExperiencePage(page) || page.level !== 'family' || page.identity.familySlug !== familySlug || page.identity.path !== identity.path) notFound()
    return page
  } catch (error) {
    if (error instanceof ProductPagePreviewNotFoundError || error instanceof ProductPageContractError || error instanceof CrossSiteContentError || error instanceof InvalidContentPathError) notFound()
    throw error
  }
})

export async function generateMetadata({params}: Props): Promise<Metadata> {
  const page = await loadPage((await params).familySlug)
  return {title: page.seo.title, description: page.seo.description, robots: {index: false, follow: false}}
}

export default async function ProductFamilyPreviewPage({params}: Props) {
  return <ProductPageRenderer page={await loadPage((await params).familySlug)} />
}
