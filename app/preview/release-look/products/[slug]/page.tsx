import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {cache} from 'react'

import {ProductPage} from '@/components/products/product-page'
import {SiteShell} from '@/components/site-shell'
import {loadSiteAReleaseLookProduct} from '@/lib/products/release-look'
import {getSiteConfig} from '@/sites'

import styles from '../../release-look.module.css'

interface ReleaseLookPageProps {
  readonly params: Promise<{readonly slug: string}>
}
export const dynamic = 'force-dynamic'

const loadReleaseLookPage = cache((slug: string) => {
  const product = loadSiteAReleaseLookProduct(slug, process.env)
  if (!product) notFound()
  return product
})

export async function generateMetadata(
  props: ReleaseLookPageProps,
): Promise<Metadata> {
  const {slug} = await props.params
  const product = loadReleaseLookPage(slug)
  return {
    title: product.seo.title,
    description: product.seo.description,
    robots: {index: false, follow: false},
  }
}

export default async function ReleaseLookProductPage(
  props: ReleaseLookPageProps,
) {
  const {slug} = await props.params
  const product = loadReleaseLookPage(slug)

  return (
    <SiteShell site={getSiteConfig('tio2-a')}>
      <aside className={styles.notice} aria-label="Local preview status">
        <strong>Local publication look — not published</strong>
        <span>Shared inquiry, CTA, and disclaimer content is intentionally hidden.</span>
      </aside>
      <ProductPage displayMode="release-look" product={product} />
    </SiteShell>
  )
}
