import type {ProductPageDto} from '@/lib/products/types'

import styles from './product-page.module.css'

interface ValidationGuideProps {
  readonly checklist: ProductPageDto['validationChecklist']
}

export function ValidationGuide({checklist}: ValidationGuideProps) {
  if (checklist.length === 0) return null

  return (
    <section
      className={styles.section}
      data-product-section="validation-guide"
      aria-labelledby="product-validation-guide-heading"
    >
      <div className={styles.sectionHeading}>
        <p className={styles.eyebrow}>Customer testing</p>
        <h2 id="product-validation-guide-heading">Validation Guide</h2>
      </div>
      <ol className={styles.checklist}>
        {checklist.map((item, index) => (
          <li className={styles.checklistItem} key={`${index}-${item}`}>
            <span className={styles.checklistNumber} aria-hidden="true">
              {index + 1}
            </span>
            <p>{item}</p>
          </li>
        ))}
      </ol>
    </section>
  )
}
