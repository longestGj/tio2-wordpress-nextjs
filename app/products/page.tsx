import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import {buildProductCollectionJsonLd} from '@/lib/seo/product-collection-jsonld'
import {buildProductCollectionMetadata} from '@/lib/seo/product-collection-metadata'
import {serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {isPublicRoute} from '@/sites/public-routes'

const PATH = '/products'
export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  const identity = resolveProductPageIdentity(PATH)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'hub' || !isPublicRoute(site.id, identity.path)) notFound()
  const page = await getSiteProductPage(site, identity.path)
  if (!page || !isValidatedProductExperiencePage(page) || page.level !== 'hub' || page.identity.path !== identity.path) notFound()
  return {page, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const {page, site} = await loadPage()
  return buildProductCollectionMetadata(page, site)
}

export default async function ProductsPage() {
  const {page, site} = await loadPage()
  const jsonLd = serializeProductJsonLd(buildProductCollectionJsonLd(page, site))
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} /><ProductPageRenderer page={page} /></>
}
