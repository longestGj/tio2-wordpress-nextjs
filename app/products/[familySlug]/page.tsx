import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {resolveProductPageIdentity, SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {buildProductCollectionJsonLd} from '@/lib/seo/product-collection-jsonld'
import {buildProductCollectionMetadata} from '@/lib/seo/product-collection-metadata'
import {serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {isPublicRoute} from '@/sites/public-routes'

interface Props {readonly params: Promise<{readonly familySlug: string}>}
export const revalidate = 3600
export const dynamicParams = true

async function loadPage({params}: Props) {
  const site = getCurrentSite()
  const {familySlug} = await params
  const identity = resolveProductPageIdentity(`/products/${familySlug}`)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'family' || identity.familySlug !== familySlug || !isPublicRoute(site.id, identity.path)) notFound()
  const page = await getSiteProductPage(site, identity.path)
  if (!page || !isValidatedProductExperiencePage(page) || page.level !== 'family' || page.identity.familySlug !== identity.familySlug || page.identity.path !== identity.path) notFound()
  return {page, site}
}

export async function generateStaticParams(): Promise<Array<{familySlug: string}>> {
  const site = getCurrentSite()
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') return []
  return SITE_A_PRODUCT_IDENTITIES.filter(({level, path}) => level === 'family' && isPublicRoute(site.id, path)).map(({familySlug}) => ({familySlug: familySlug!}))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const {page, site} = await loadPage(props)
  return buildProductCollectionMetadata(page, site)
}

export default async function ProductFamilyPage(props: Props) {
  const {page, site} = await loadPage(props)
  const jsonLd = serializeProductJsonLd(buildProductCollectionJsonLd(page, site))
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} /><ProductPageRenderer page={page} /></>
}
