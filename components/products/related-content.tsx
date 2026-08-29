import type {ProductLink, ProductPageDto} from '@/lib/products/types'
import type {EditorialLink} from '@/lib/editorial/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface RelatedGroupProps {
  readonly heading: string
  readonly links: readonly ProductLink[]
}

function DetailRelatedCard({
  description,
  label,
  link,
  actionLabel,
}: {
  readonly description: string
  readonly label: string
  readonly link: EditorialLink
  readonly actionLabel?: string
}): React.ReactNode {
  return (
    <article className={detail.relatedCard}>
      <p className={detail.eyebrow}>{label}</p>
      <h3>
        {link.href && !actionLabel ? <a href={link.href}>{link.title}</a> : link.title}
      </h3>
      <p>{description}</p>
      {actionLabel ? (
        link.href ? <a href={link.href}>{actionLabel}</a> : <span>{actionLabel}</span>
      ) : null}
    </article>
  )
}

export function RelatedContentV05({
  copy,
  links,
}: {
  readonly copy: ProductDetailPageDto['presentation']['related']
  readonly links: ProductDetailPageDto['relatedLinks']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-related-heading"
      className={`${detail.section} ${detail.wrap}`}
      data-product-section="related-products-resources"
    >
      <div className={detail.sectionHead}>
        <p className={detail.eyebrow}>{copy.eyebrow}</p>
        <h2 id="detail-related-heading">{copy.heading}</h2>
      </div>
      <div className={detail.relatedGrid}>
        {links.products.map((link, index) => (
          <DetailRelatedCard
            actionLabel={copy.productActionLabel}
            description={copy.productDescriptions[index] ?? ''}
            key={`${link.type}-${link.id}`}
            label={copy.productLabel}
            link={link}
          />
        ))}
        {links.resources.map((link, index) => (
          <DetailRelatedCard
            description={copy.resourceDescriptions[index] ?? ''}
            key={`${link.type}-${link.id}`}
            label={copy.resourceLabel}
            link={link}
          />
        ))}
        <DetailRelatedCard
          description={copy.familyDescription}
          label={copy.familyLabel}
          link={links.family}
        />
      </div>
    </section>
  )
}

function RelatedGroup({heading, links}: RelatedGroupProps) {
  if (links.length === 0) return null

  return (
    <div className={styles.relatedGroup}>
      <h3>{heading}</h3>
      <ul className={styles.linkList}>
        {links.map((link, index) => (
          <li key={`${index}-${link.title}`}>
            {link.href ? (
              <a href={link.href}>{link.title}</a>
            ) : (
              <span>{link.title}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

interface RelatedContentProps {
  readonly relatedLinks: ProductPageDto['relatedLinks']
}

export function RelatedContent({relatedLinks}: RelatedContentProps) {
  const hasLinks = Object.values(relatedLinks).some((links) => links.length > 0)
  if (!hasLinks) return null

  return (
    <section
      className={styles.section}
      data-product-section="related-applications-and-resources"
      aria-labelledby="product-related-content-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Continue the comparison</p>
        <h2 id="product-related-content-heading">
          Related Applications and Resources
        </h2>
      </div>
      <div className={styles.relatedGrid}>
        <RelatedGroup
          heading="Related Applications"
          links={relatedLinks.applications}
        />
        <RelatedGroup
          heading="Technical Resources"
          links={relatedLinks.resources}
        />
        <RelatedGroup heading="Related Products" links={relatedLinks.products} />
      </div>
    </section>
  )
}
