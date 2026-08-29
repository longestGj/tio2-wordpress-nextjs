import type {ProductPageDto} from '@/lib/products/types'
import type {ProductDetailPageDto} from '@/lib/products/page-types'

import detail from './product-detail.module.css'
import styles from './product-page.module.css'

interface PerformancePrioritiesProps {
  readonly priorities: ProductPageDto['performancePriorities']
}

export function PerformancePrioritiesV05({
  copy,
  priorities,
}: {
  readonly copy: ProductDetailPageDto['presentation']['formulationPriorities']
  readonly priorities: ProductDetailPageDto['formulationPriorities']
}): React.ReactNode {
  return (
    <section
      aria-labelledby="detail-priorities-heading"
      className={`${detail.section} ${detail.soft}`}
      data-product-section="formulation-priorities"
    >
      <div className={detail.wrap}>
        <div className={detail.sectionHead}>
          <p className={detail.eyebrow}>{copy.eyebrow}</p>
          <h2 id="detail-priorities-heading">{copy.heading}</h2>
        </div>
        <ol className={detail.priorityGrid}>
          {priorities.map((priority, index) => (
            <li data-formulation-priority key={priority.title}>
              <span aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <h3>{priority.title}</h3>
              <p>{priority.explanation}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
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
