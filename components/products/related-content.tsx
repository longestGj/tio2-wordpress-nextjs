import type {ProductLink, ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface RelatedGroupProps {
  readonly heading: string
  readonly links: readonly ProductLink[]
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
