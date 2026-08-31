import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {MalaysiaProductHub} from '@/components/sites/tio2-my/products/malaysia-product-hub'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {resolveProductPageIdentity} from '@/lib/products/page-graph'
import {buildProductCollectionJsonLd} from '@/lib/seo/product-collection-jsonld'
import {buildProductCollectionMetadata} from '@/lib/seo/product-collection-metadata'
import {
  buildMalaysiaProductHubJsonLd,
  serializeMalaysiaProductHubJsonLd,
} from '@/lib/seo/product-hub-jsonld'
import {buildMalaysiaProductHubMetadata} from '@/lib/seo/product-hub-metadata'
import {serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaProductHub} from '@/lib/wordpress/product-hub-v01-queries'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {isPublicRoute} from '@/sites/public-routes'

const PATH = '/products'
export const revalidate = 3600

async function loadPage() {
  const site = getCurrentSite()
  if (site.id === 'tio2-my') {
    const page = await getMalaysiaProductHub()
    return {kind: 'malaysia' as const, page, site}
  }

  const identity = resolveProductPageIdentity(PATH)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'hub' || !isPublicRoute(site.id, identity.path)) notFound()
  const page = await getSiteProductPage(site, identity.path)
  if (!page || !isValidatedProductExperiencePage(page) || page.level !== 'hub' || page.identity.path !== identity.path) notFound()
  return {kind: 'site-a' as const, page, site}
}

export async function generateMetadata(): Promise<Metadata> {
  const result = await loadPage()
  return result.kind === 'malaysia'
    ? buildMalaysiaProductHubMetadata(result.site, result.page)
    : buildProductCollectionMetadata(result.page, result.site)
}

export default async function ProductsPage() {
  const result = await loadPage()
  if (result.kind === 'malaysia') {
    const jsonLd = serializeMalaysiaProductHubJsonLd(
      buildMalaysiaProductHubJsonLd(result.site, result.page),
    )
    return (
      <MalaysiaProductHub
        productHub={result.page}
        structuredData={(
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{__html: jsonLd}}
          />
        )}
      />
    )
  }

  const jsonLd = serializeProductJsonLd(
    buildProductCollectionJsonLd(result.page, result.site),
  )
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} /><ProductPageRenderer page={result.page} /></>
}
