import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPage} from '@/components/products/product-page'
import {SiteShell} from '@/components/site-shell'
import {buildProductJsonLd, serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {buildProductMetadata} from '@/lib/seo/product-metadata'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getSiteProduct} from '@/lib/wordpress/product-queries'
import type {SiteConfig} from '@/sites'
import {getApprovedProductSlugs} from '@/sites/public-routes'

interface ProductRouteProps {
  readonly params: Promise<{readonly slug: string}>
}

export const revalidate = 3600
export const dynamicParams = true

function isSiteA(site: SiteConfig): boolean {
  return site.id === 'tio2-a' && site.wordpressScope === 'tio2-a'
}

async function getApprovedProduct({params}: ProductRouteProps) {
  const site = getCurrentSite()
  const {slug} = await params

  if (
    !isSiteA(site) ||
    !getApprovedProductSlugs(site.id).includes(slug)
  ) {
    notFound()
  }

  const product = await getSiteProduct(site, slug)
  if (
    !product ||
    product.identity.slug !== slug ||
    product.identity.path !== `/products/${slug}`
  ) {
    notFound()
  }

  return {product, site}
}

export async function generateStaticParams(): Promise<Array<{slug: string}>> {
  const site = getCurrentSite()
  if (!isSiteA(site)) return []

  return getApprovedProductSlugs(site.id).map((slug) => ({slug}))
}

export async function generateMetadata(
  props: ProductRouteProps,
): Promise<Metadata> {
  const {product, site} = await getApprovedProduct(props)
  return buildProductMetadata(product, site)
}

export default async function ProductRoute(props: ProductRouteProps) {
  const {product, site} = await getApprovedProduct(props)
  const jsonLd = serializeProductJsonLd(buildProductJsonLd(product, site))

  return (
    <SiteShell site={site}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{__html: jsonLd}}
      />
      <ProductPage product={product} />
    </SiteShell>
  )
}
