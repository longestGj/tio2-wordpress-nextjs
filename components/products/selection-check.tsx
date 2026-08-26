import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface SelectionCheckProps {
  readonly selection: ProductPageDto['selection']
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
