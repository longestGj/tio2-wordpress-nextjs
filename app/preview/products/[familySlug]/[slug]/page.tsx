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

interface Props {readonly params: Promise<{readonly familySlug: string; readonly slug: string}>}
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const fetchCache = 'force-no-store'

const loadPage = cache(async (familySlug: string, slug: string) => {
  const site = getCurrentSite()
  const identity = resolveProductPageIdentity(`/products/${familySlug}/${slug}`)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'detail' || identity.familySlug !== familySlug || identity.productSlug !== slug || !(await hasScopedPreviewSession(site.id, identity.path))) notFound()
  try {
    const page = await getProductPagePreview(site, identity.path)
    if (!isValidatedProductExperiencePage(page) || page.level !== 'detail' || page.identity.familySlug !== familySlug || page.identity.path !== identity.path) notFound()
    return page
  } catch (error) {
    if (error instanceof ProductPagePreviewNotFoundError || error instanceof ProductPageContractError || error instanceof CrossSiteContentError || error instanceof InvalidContentPathError) notFound()
    throw error
  }
})

async function paramsOf(props: Props) {return props.params}
export async function generateMetadata(props: Props): Promise<Metadata> {
  const {familySlug, slug} = await paramsOf(props)
  const page = await loadPage(familySlug, slug)
  return {title: page.seo.title, description: page.seo.description, robots: {index: false, follow: false}}
}

export default async function ProductDetailPreviewPage(props: Props) {
  const {familySlug, slug} = await paramsOf(props)
  return <ProductPageRenderer page={await loadPage(familySlug, slug)} />
}
