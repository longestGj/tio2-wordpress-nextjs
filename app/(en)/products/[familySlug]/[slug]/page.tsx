import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {resolveProductPageIdentity, SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {buildProductJsonLd, serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {buildProductMetadata} from '@/lib/seo/product-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {isPublicRoute} from '@/sites/public-routes'

interface Props {readonly params: Promise<{readonly familySlug: string; readonly slug: string}>}
export const revalidate = 3600
export const dynamicParams = false

async function loadPage({params}: Props) {
  const site = getCurrentSite()
  const {familySlug, slug} = await params
  const identity = resolveProductPageIdentity(`/products/${familySlug}/${slug}`)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'detail' || identity.familySlug !== familySlug || identity.productSlug !== slug || !isPublicRoute(site.id, identity.path)) notFound()
  const page = await getSiteProductPage(site, identity.path)
  if (!page || !isValidatedProductExperiencePage(page) || page.level !== 'detail' || page.identity.familySlug !== familySlug || page.identity.path !== identity.path) notFound()
  return {page, site}
}

export async function generateStaticParams(): Promise<Array<{familySlug: string; slug: string}>> {
  const site = getCurrentSite()
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') return []
  return SITE_A_PRODUCT_IDENTITIES.filter(({level, path}) => level === 'detail' && isPublicRoute(site.id, path)).map(({familySlug, productSlug}) => ({familySlug: familySlug!, slug: productSlug!}))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const {page, site} = await loadPage(props)
  return buildProductMetadata(page, site)
}

export default async function ProductDetailPage(props: Props) {
  const {page, site} = await loadPage(props)
  const jsonLd = serializeProductJsonLd(buildProductJsonLd(page, site))
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} /><ProductPageRenderer page={page} /></>
}
