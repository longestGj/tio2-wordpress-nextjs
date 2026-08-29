import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface SelectionCheckProps {
  readonly selection: ProductPageDto['selection']
}

export function SelectionCheckV05({
  copy,
  selection,
}: {
  readonly copy: ProductDetailPageDto['presentation']['fitCheck']
  readonly selection: ProductDetailPageDto['fitCheck']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-fit-check-heading"
      className={`${detail.section} ${detail.wrap}`}
      data-product-section="fit-check"
    >
      <div className={detail.sectionHead}>
        <p className={detail.eyebrow}>{copy.eyebrow}</p>
        <h2 id="detail-fit-check-heading">{copy.heading}</h2>
      </div>
      <div className={detail.fitGrid}>
        <article className={detail.fitCard}>
          <h3>{copy.fitHeading}</h3>
          <ul>{selection.fitWhen.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className={`${detail.fitCard} ${detail.discussCard}`}>
          <h3>{copy.discussHeading}</h3>
          <ul>{selection.discussFirstWhen.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </div>
    </section>
  )
}

export function SelectionCheck({selection}: SelectionCheckProps) {
  return (
    <section
      className={styles.section}
      data-product-section="selection-check"
      aria-labelledby="product-selection-check-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>First screening</p>
        <h2 id="product-selection-check-heading">Selection Check</h2>
      </div>
      <div className={styles.selectionGrid}>
        <article className={`${styles.decisionPanel} ${styles.fitsPanel}`}>
          <h3>Fits When</h3>
          <ul className={styles.compactList}>
            {selection.fitWhen.map((item, index) => (
              <li key={`fit-${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </article>
        <article className={`${styles.decisionPanel} ${styles.discussPanel}`}>
          <h3>Discuss First When</h3>
          <ul className={styles.compactList}>
            {selection.discussFirstWhen.map((item, index) => (
              <li key={`discuss-${index}-${item}`}>{item}</li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  )
}
