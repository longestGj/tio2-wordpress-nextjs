import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface PerformancePrioritiesProps {
  readonly priorities: ProductPageDto['performancePriorities']
}

export function PerformancePriorities({
  priorities,
}: PerformancePrioritiesProps) {
  return (
    <section
      className={`${styles.section} ${styles.softSection}`}
      data-product-section="performance-priorities"
      aria-labelledby="product-performance-priorities-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Evaluation focus</p>
        <h2 id="product-performance-priorities-heading">
          Performance Priorities
        </h2>
      </div>
      <ol className={styles.cardGrid}>
        {priorities.map((priority, index) => (
          <li
            className={styles.priorityCard}
            key={`${index}-${priority.title}`}
          >
            <span className={styles.cardIndex} aria-hidden="true">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3>{priority.title}</h3>
            <p>{priority.explanation}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
