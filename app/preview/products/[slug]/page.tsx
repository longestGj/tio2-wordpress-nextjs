import type {Metadata} from 'next'
import {notFound} from 'next/navigation'

import {ProductPage} from '@/components/products/product-page'
import {SiteShell} from '@/components/site-shell'
import {getCurrentSite} from '@/lib/sites/current-site'
import {
  getProductPreview,
  ProductPreviewNotFoundError,
} from '@/lib/wordpress/product-preview'
import {hasScopedPreviewSession} from '@/lib/wordpress/preview-session'
import {
  CrossSiteContentError,
  InvalidContentPathError,
} from '@/lib/wordpress/types'

interface ProductPreviewPageProps {
  readonly params: Promise<{readonly slug: string}>
}

export const dynamic = 'force-dynamic'

async function loadProductPreviewPage({
  params,
}: ProductPreviewPageProps) {
  const site = getCurrentSite()
  const {slug} = await params
  if (
    site.id !== 'tio2-a' ||
    site.wordpressScope !== 'tio2-a' ||
    !/^tp-[a-z]{1,2}[0-9]{3}$/u.test(slug)
  ) {
    notFound()
  }

  const canonicalPath = `/products/${slug}`
  if (!await hasScopedPreviewSession(site.id, canonicalPath)) {
    notFound()
  }

  let product
  try {
    product = await getProductPreview(site, canonicalPath)
  } catch (error) {
    if (
      error instanceof ProductPreviewNotFoundError ||
      error instanceof CrossSiteContentError ||
      error instanceof InvalidContentPathError
    ) {
      notFound()
    }
    throw error
  }

  return {product, site}
}

export async function generateMetadata(
  props: ProductPreviewPageProps,
): Promise<Metadata> {
  const {product} = await loadProductPreviewPage(props)
  return {
    title: product.seo.title,
    description: product.seo.description,
    robots: {index: false, follow: false},
  }
}

export default async function ProductPreviewPage(props: ProductPreviewPageProps) {
  const {product, site} = await loadProductPreviewPage(props)
  return (
    <SiteShell site={site}>
      <ProductPage product={product} />
    </SiteShell>
  )
}
