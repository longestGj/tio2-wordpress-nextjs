import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {MalaysiaProductDetail} from '@/components/sites/tio2-my/products/malaysia-product-detail'
import {isValidatedProductExperiencePage} from '@/lib/products/page-dto'
import {resolveProductPageIdentity, SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import {buildProductCollectionJsonLd} from '@/lib/seo/product-collection-jsonld'
import {buildProductCollectionMetadata} from '@/lib/seo/product-collection-metadata'
import {
  buildMalaysiaProductDetailJsonLd,
  serializeMalaysiaProductDetailJsonLd,
} from '@/lib/seo/product-detail-jsonld'
import {buildMalaysiaProductDetailMetadata} from '@/lib/seo/product-detail-metadata'
import {serializeProductJsonLd} from '@/lib/seo/product-jsonld'
import {getCurrentSite} from '@/lib/sites/current-site'
import {getMalaysiaProductDetail} from '@/lib/wordpress/product-detail-v01-queries'
import {getSiteProductPage} from '@/lib/wordpress/product-page-queries'
import {isPublicRoute} from '@/sites/public-routes'

interface Props {readonly params: Promise<{readonly familySlug: string}>}
export const revalidate = 3600
export const dynamicParams = true

async function loadPage({params}: Props) {
  const site = getCurrentSite()
  const {familySlug} = await params
  if (site.id === 'tio2-my') {
    if (site.wordpressScope !== 'tio2-my' || familySlug !== 'm-350') notFound()
    const page = await getMalaysiaProductDetail('m-350')
    return {kind: 'malaysia' as const, page, site}
  }
  const identity = resolveProductPageIdentity(`/products/${familySlug}`)
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a' || identity?.level !== 'family' || identity.familySlug !== familySlug || !isPublicRoute(site.id, identity.path)) notFound()
  const page = await getSiteProductPage(site, identity.path)
  if (!page || !isValidatedProductExperiencePage(page) || page.level !== 'family' || page.identity.familySlug !== identity.familySlug || page.identity.path !== identity.path) notFound()
  return {kind: 'site-a' as const, page, site}
}

export async function generateStaticParams(): Promise<Array<{familySlug: string}>> {
  const site = getCurrentSite()
  if (site.id === 'tio2-my' && site.wordpressScope === 'tio2-my') {
    return [{familySlug: 'm-350'}]
  }
  if (site.id !== 'tio2-a' || site.wordpressScope !== 'tio2-a') return []
  return SITE_A_PRODUCT_IDENTITIES.filter(({level, path}) => level === 'family' && isPublicRoute(site.id, path)).map(({familySlug}) => ({familySlug: familySlug!}))
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const result = await loadPage(props)
  return result.kind === 'malaysia'
    ? buildMalaysiaProductDetailMetadata(result.site, result.page)
    : buildProductCollectionMetadata(result.page, result.site)
}

export default async function ProductFamilyPage(props: Props) {
  const result = await loadPage(props)
  if (result.kind === 'malaysia') {
    const jsonLd = serializeMalaysiaProductDetailJsonLd(
      buildMalaysiaProductDetailJsonLd(result.site, result.page),
    )
    return <MalaysiaProductDetail product={result.page} structuredData={<script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} />} />
  }
  const jsonLd = serializeProductJsonLd(buildProductCollectionJsonLd(result.page, result.site))
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: jsonLd}} /><ProductPageRenderer page={result.page} /></>
}
